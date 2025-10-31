from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import httpx
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Pterodactyl config
PTERO_URL = os.environ.get('PTERO_URL', 'https://panel.victuscloud.xyz')
PTERO_APP_KEY = os.environ.get('PTERO_APP_KEY', '')
PTERO_CLIENT_KEY = os.environ.get('PTERO_CLIENT_KEY', '')

# JWT config
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class WebhookConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webhook_url: str
    enabled: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebhookConfigInput(BaseModel):
    webhook_url: str
    enabled: bool = True

class AutomationRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rule_type: str  # "category_inactive", "scheduled"
    category: Optional[str] = None
    inactive_minutes: Optional[int] = None
    schedule_time: Optional[str] = None
    enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AutomationRuleInput(BaseModel):
    name: str
    rule_type: str
    category: Optional[str] = None
    inactive_minutes: Optional[int] = None
    schedule_time: Optional[str] = None
    enabled: bool = True

class ServerAction(BaseModel):
    action: str  # "start", "stop", "restart", "kill"

class BulkAction(BaseModel):
    action: str
    category: Optional[str] = None
    filter_type: str  # "category", "inactive", "all"

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def send_discord_webhook(message: str):
    try:
        webhook_doc = await db.webhook_config.find_one({"enabled": True})
        if webhook_doc and webhook_doc.get('webhook_url'):
            async with httpx.AsyncClient() as client:
                await client.post(
                    webhook_doc['webhook_url'],
                    json={
                        "content": f"[Victus Cloud Ptero Manager] {message}",
                        "username": "Victus Cloud Bot"
                    },
                    timeout=5.0
                )
    except Exception as e:
        logging.error(f"Failed to send webhook: {e}")

# Pterodactyl API functions
async def get_pterodactyl_servers():
    """Fetch all servers with pagination"""
    async with httpx.AsyncClient() as client:
        try:
            headers = {
                "Authorization": f"Bearer {PTERO_APP_KEY}",
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
            
            all_servers = []
            page = 1
            
            while True:
                response = await client.get(
                    f"{PTERO_URL}/api/application/servers?page={page}&per_page=100",
                    headers=headers,
                    timeout=15.0
                )
                response.raise_for_status()
                data = response.json()
                
                servers = data.get('data', [])
                all_servers.extend(servers)
                
                # Check if there are more pages
                pagination = data.get('meta', {}).get('pagination', {})
                if page >= pagination.get('total_pages', 1):
                    break
                page += 1
            
            logging.info(f"Fetched {len(all_servers)} servers total")
            return all_servers
        except Exception as e:
            logging.error(f"Failed to fetch servers: {e}")
            return []

async def get_nest_info(nest_id: int):
    """Get nest information by ID"""
    async with httpx.AsyncClient() as client:
        try:
            headers = {
                "Authorization": f"Bearer {PTERO_APP_KEY}",
                "Accept": "application/json"
            }
            response = await client.get(
                f"{PTERO_URL}/api/application/nests/{nest_id}",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get('attributes', {}).get('name', 'Unknown')
        except Exception as e:
            logging.warning(f"Failed to fetch nest {nest_id}: {e}")
            return "Unknown"

async def get_egg_info(nest_id: int, egg_id: int):
    """Get egg information by nest and egg ID"""
    async with httpx.AsyncClient() as client:
        try:
            headers = {
                "Authorization": f"Bearer {PTERO_APP_KEY}",
                "Accept": "application/json"
            }
            response = await client.get(
                f"{PTERO_URL}/api/application/nests/{nest_id}/eggs/{egg_id}",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get('attributes', {}).get('name', 'Unknown')
        except Exception as e:
            logging.warning(f"Failed to fetch egg {egg_id}: {e}")
            return "Unknown"

async def get_server_resources(server_id: str):
    """Get server resources including player count"""
    async with httpx.AsyncClient() as client:
        try:
            headers = {
                "Authorization": f"Bearer {PTERO_CLIENT_KEY}",
                "Accept": "application/json"
            }
            response = await client.get(
                f"{PTERO_URL}/api/client/servers/{server_id}/resources",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logging.warning(f"Failed to fetch resources for {server_id}: {e}")
            return {
                "attributes": {
                    "current_state": "offline",
                    "cpu_absolute": 0,
                    "memory_bytes": 0,
                    "memory_limit_bytes": 1,
                    "disk_bytes": 0
                }
            }

async def control_server_power(server_id: str, action: str):
    """Control server power"""
    async with httpx.AsyncClient() as client:
        try:
            headers = {
                "Authorization": f"Bearer {PTERO_CLIENT_KEY}",
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
            response = await client.post(
                f"{PTERO_URL}/api/client/servers/{server_id}/power",
                headers=headers,
                json={"signal": action},
                timeout=10.0
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logging.error(f"Failed to control server {server_id}: {e}")
            return False

# Initialize default admin if not exists
async def init_admin():
    admin = await db.admins.find_one({"username": "admin"})
    if not admin:
        default_admin = Admin(
            username="admin",
            hashed_password=get_password_hash("admin123")
        )
        doc = default_admin.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.admins.insert_one(doc)
        logging.info("Default admin created: username=admin, password=admin123")

@app.on_event("startup")
async def startup_event():
    await init_admin()

# Routes
@api_router.post("/auth/login", response_model=Token)
async def login(credentials: AdminLogin):
    admin = await db.admins.find_one({"username": credentials.username})
    if not admin or not verify_password(credentials.password, admin['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": credentials.username})
    await send_discord_webhook(f"Admin '{credentials.username}' logged in")
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/servers")
async def get_servers(username: str = Depends(verify_token)):
    """Get all servers with enriched data"""
    servers = await get_pterodactyl_servers()
    
    # Cache for nest and egg names
    nest_cache = {}
    egg_cache = {}
    
    enriched_servers = []
    for server in servers:
        attrs = server['attributes']
        nest_id = attrs.get('nest')
        egg_id = attrs.get('egg')
        
        # Get nest name
        if nest_id and nest_id not in nest_cache:
            nest_cache[nest_id] = await get_nest_info(nest_id)
        
        # Get egg name
        cache_key = f"{nest_id}_{egg_id}"
        if nest_id and egg_id and cache_key not in egg_cache:
            egg_cache[cache_key] = await get_egg_info(nest_id, egg_id)
        
        # Add enriched data
        enriched_server = {
            **server,
            'nest_name': nest_cache.get(nest_id, 'Unknown'),
            'egg_name': egg_cache.get(cache_key, 'Unknown')
        }
        enriched_servers.append(enriched_server)
    
    return {"servers": enriched_servers}

@api_router.get("/servers/resources")
async def get_all_resources(username: str = Depends(verify_token)):
    servers = await get_pterodactyl_servers()
    resources = []
    
    for server in servers:
        server_id = server['attributes']['identifier']
        resource_data = await get_server_resources(server_id)
        if resource_data:
            resources.append({
                "server_id": server_id,
                "name": server['attributes']['name'],
                "resources": resource_data.get('attributes', {})
            })
    
    return {"resources": resources}

@api_router.post("/servers/{server_id}/power")
async def server_power_action(server_id: str, action: ServerAction, username: str = Depends(verify_token)):
    success = await control_server_power(server_id, action.action)
    if success:
        await send_discord_webhook(f"Server {server_id} - Action: {action.action} by {username}")
        return {"success": True, "message": f"Action {action.action} sent to server"}
    raise HTTPException(status_code=500, detail="Failed to control server")

@api_router.post("/servers/bulk-action")
async def bulk_server_action(bulk: BulkAction, username: str = Depends(verify_token)):
    servers = await get_pterodactyl_servers()
    affected = []
    
    for server in servers:
        server_id = server['attributes']['identifier']
        server_name = server['attributes']['name']
        
        # Filter logic
        should_act = False
        if bulk.filter_type == "all":
            should_act = True
        elif bulk.filter_type == "category" and bulk.category:
            egg_name = server['attributes'].get('egg', {}).get('name', '') if isinstance(server['attributes'].get('egg'), dict) else ''
            nest_name = server['attributes'].get('nest', {}).get('name', '') if isinstance(server['attributes'].get('nest'), dict) else ''
            category = egg_name or nest_name
            if bulk.category.lower() in category.lower():
                should_act = True
        elif bulk.filter_type == "inactive":
            resource_data = await get_server_resources(server_id)
            if resource_data:
                current_state = resource_data.get('attributes', {}).get('current_state', '')
                if current_state in ['offline', 'stopped']:
                    should_act = True
        
        if should_act:
            success = await control_server_power(server_id, bulk.action)
            if success:
                affected.append({"id": server_id, "name": server_name})
    
    await send_discord_webhook(f"Bulk action {bulk.action} executed on {len(affected)} servers by {username}")
    return {"success": True, "affected": affected, "count": len(affected)}

@api_router.get("/categories")
async def get_categories(username: str = Depends(verify_token)):
    """Get all unique categories from servers"""
    servers = await get_pterodactyl_servers()
    
    # Cache for nest and egg names
    nest_cache = {}
    egg_cache = {}
    categories = set()
    
    for server in servers:
        attrs = server.get('attributes', {})
        nest_id = attrs.get('nest')
        egg_id = attrs.get('egg')
        
        # Get nest name
        if nest_id and nest_id not in nest_cache:
            nest_cache[nest_id] = await get_nest_info(nest_id)
            
        # Get egg name
        cache_key = f"{nest_id}_{egg_id}"
        if nest_id and egg_id and cache_key not in egg_cache:
            egg_cache[cache_key] = await get_egg_info(nest_id, egg_id)
        
        # Add both nest and egg names as categories
        if nest_id:
            categories.add(nest_cache.get(nest_id, 'Unknown'))
        if cache_key in egg_cache:
            categories.add(egg_cache[cache_key])
    
    # Remove 'Unknown' if present
    categories.discard('Unknown')
    
    return {"categories": sorted(list(categories))}

@api_router.post("/automation")
async def create_automation(rule: AutomationRuleInput, username: str = Depends(verify_token)):
    rule_obj = AutomationRule(**rule.model_dump())
    doc = rule_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.automation_rules.insert_one(doc)
    await send_discord_webhook(f"Automation rule '{rule.name}' created by {username}")
    return rule_obj

@api_router.get("/automation")
async def get_automation_rules(username: str = Depends(verify_token)):
    rules = await db.automation_rules.find({}, {"_id": 0}).to_list(1000)
    return {"rules": rules}

@api_router.delete("/automation/{rule_id}")
async def delete_automation(rule_id: str, username: str = Depends(verify_token)):
    result = await db.automation_rules.delete_one({"id": rule_id})
    if result.deleted_count > 0:
        await send_discord_webhook(f"Automation rule deleted by {username}")
        return {"success": True}
    raise HTTPException(status_code=404, detail="Rule not found")

@api_router.post("/webhook")
async def configure_webhook(config: WebhookConfigInput, username: str = Depends(verify_token)):
    # Delete existing config
    await db.webhook_config.delete_many({})
    
    webhook = WebhookConfig(**config.model_dump())
    doc = webhook.model_dump()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.webhook_config.insert_one(doc)
    return webhook

@api_router.get("/webhook")
async def get_webhook_config(username: str = Depends(verify_token)):
    config = await db.webhook_config.find_one({}, {"_id": 0})
    return config if config else {"webhook_url": "", "enabled": False}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()