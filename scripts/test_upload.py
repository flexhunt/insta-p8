import os
import random
import requests
from supabase import create_client, Client
try:
    from dotenv import load_dotenv
    # Load .env from current directory or specific path
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

# --- SETTINGS ---
# Replace these with your actual values or env vars
API_URL = "http://localhost:3000/api/hooks/upload-washed-reel" # Local testing
# API_URL = "https://insta-p8.vercel.app/api/hooks/upload-washed-reel" # Production

# Load secrets from ENV
API_SECRET = os.getenv("API_SECRET_KEY", "ayush") 
USER_ID = "25420744910952036" # Keep this hardcoded for now or use os.getenv("TEST_USER_ID")

# Supabase
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") 

BUCKET_NAME = "media"
FOLDER_PATH = "washed_videos" 

# --- 🧠 SMART CAPTIONS LIST ---
VIRAL_CAPTIONS = [
    "Wait for the end! 😱 You won't believe this. #viral #trending #reels",
    "This is actually insane 🔥 Tag a friend who needs to see this! #fyp #explore",
    "Mind blown 🤯 Kya lagta hai fake hai ya real? Comments mein batao! #magic #illusion",
    "Satisfying to watch 🤤 Can't stop watching this loop! #satisfying #oddlysatisfying",
    "Tag that one friend 😂👇 #funny #comedy #relatable",
    "Secret trick revealed 🤫 Save this for later! #hacks #lifehacks",
    "Best moment captured on camera 📸 #caughtoncamera #epic",
    "Respect 🫡❤️ #wholesome #respect #humanity",
    "Day made! 😍 Send this to someone to make their day. #cute #love",
    "POV: You found the perfect video ✨ #aesthetic #vibes"
]

try:
    from supabase import create_client, Client, ClientOptions
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase ENV variables missing")
        
    # Increase timeout for upload (default is usually short)
    opts = ClientOptions().replace(postgrest_client_timeout=300, storage_client_timeout=300)
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options=opts)
except Exception as e:
    print(f"⚠️ Supabase Config Error: {e}")
    print("Make sure .env file exists in the project root and requirements are installed.")
    exit(1)

def wash_video(file_path):
    """Appends random bytes to the file to change its hash (Washing)"""
    try:
        print(f"🚿 Washing video (changing hash)...")
        with open(file_path, "ab") as f:
            # Append random junk data (1KB - 10KB)
            junk_size = random.randint(1024, 10240)
            f.write(os.urandom(junk_size))
        print(f"✨ Video washed! Hash changed.")
        return True
    except Exception as e:
        print(f"❌ Washing failed: {e}")
        return False

def process_file(file_path):
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    file_name = os.path.basename(file_path)
    print(f"\n🎥 Picked: {file_name}")

    # 0. Wash Video (Hash Change)
    if not wash_video(file_path):
        print("Skipping upload due to wash failure.")
        return

    # 1. Random Caption Pick Karo
    selected_caption = random.choice(VIRAL_CAPTIONS)
    print(f"📝 Caption: {selected_caption}")

    # 1.5 Debug: Check Buckets
    try:
        print("🔍 Checking buckets...")
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        print(f"   Available buckets: {bucket_names}")
        if BUCKET_NAME not in bucket_names:
            print(f"⚠️ Bucket '{BUCKET_NAME}' NOT found in list! Please run valid migrations.")
    except Exception as e:
        print(f"⚠️ Failed to list buckets: {e}")

    # 2. Upload to Supabase Storage
    public_url = ""
    try:
        print("☁️ Uploading to Storage...")
        
        # Read file
        with open(file_path, 'rb') as f:
            # Upload with Upsert
            res = supabase.storage.from_(BUCKET_NAME).upload(
                path=f"uploads/{file_name}", 
                file=f,
                file_options={"content-type": "video/mp4", "upsert": "true"}
            )
        
        # Get Public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(f"uploads/{file_name}")
        print(f"✅ Uploaded: {public_url}")

    except Exception as e:
        print(f"❌ Storage Error: {e}")
        return

    # 3. Send to API (Pool)
    payload = {
        "userId": USER_ID,
        "videoUrl": public_url,
        "caption": selected_caption
    }
    
    headers = {"x-api-secret": API_SECRET, "Content-Type": "application/json"}

    try:
        res = requests.post(API_URL, json=payload, headers=headers)
        if res.status_code == 200:
            print(f"✅ Success! Added to Content Pool.")
            print(res.json())
        else:
            print(f"⚠️ API Error: {res.text}")
    except Exception as e:
        print(f"❌ API Fail: {e}")

# --- MAIN LOOP (BUNDLE UPLOADER) ---
# Create folder if not exists
if not os.path.exists(FOLDER_PATH):
    print(f"⚠️ Folder '{FOLDER_PATH}' not found. Creating it.")
    os.makedirs(FOLDER_PATH)
    print(f"👉 Please put .mp4 files in '{FOLDER_PATH}' and run again.")

# Check for single test file just in case user wants to test immediately
single_test_file = "generated_video (6).mp4"
if os.path.exists(single_test_file):
    # Copy it to folder for testing
    import shutil
    shutil.copy(single_test_file, os.path.join(FOLDER_PATH, "test_video.mp4"))

files = [f for f in os.listdir(FOLDER_PATH) if f.endswith('.mp4')]
print(f"🚀 Found {len(files)} videos in bundle. Starting upload...")

for i, file in enumerate(files):
    full_path = os.path.join(FOLDER_PATH, file)
    print(f"--- Processing {i+1}/{len(files)} ---")
    process_file(full_path)

print("\n🎉 All Done! Ab jake so jao. 😴")
