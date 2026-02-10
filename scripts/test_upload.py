import os
import random
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env variables (Optional, if user uses .env locally)
load_dotenv()

# --- SETTINGS ---
# Replace these with your actual values or env vars
API_URL = "http://localhost:3000/api/hooks/upload-washed-reel" # Local testing
# API_URL = "https://insta-p8.vercel.app/api/hooks/upload-washed-reel" # Production

API_SECRET = "ayush" 
USER_ID = "25420744910952036" # Hardcoded from previous context or use os.getenv("USER_ID")

# Supabase
# NOTE: You must provide these! I'm using placeholders or trying to read from env
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "your-anon-role-key") 
# Note: For upload, Anon key is fine if RLS policies allow public upload to 'media' bucket. 
# If not, you need SERVICE_ROLE_KEY.
# SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-service-role-key")

BUCKET_NAME = "media"
FOLDER_PATH = "washed_videos" # Folder containing videos to upload

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
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"⚠️ Supabase Config Missing. make sure to set SUPABASE_URL and SUPABASE_KEY via env or hardcode.")
    print(f"Error: {e}")
    exit(1)

def process_file(file_path):
    file_name = os.path.basename(file_path)
    print(f"\n🎥 Picked: {file_name}")

    # 1. Random Caption Pick Karo
    selected_caption = random.choice(VIRAL_CAPTIONS)
    print(f"📝 Caption: {selected_caption}")

    # 2. Upload to Supabase Storage
    public_url = ""
    try:
        print("☁️ Uploading to Storage...")
        
        # Read file
        with open(file_path, 'rb') as f:
            # Upload with Upsert
            res = supabase.storage.from_(BUCKET_NAME).upload(
                path=f"uploads/{file_name}", # Changed folder to 'uploads' to match previous logic or 'pool'
                file=f,
                file_options={"content-type": "video/mp4", "upsert": "true"}
            )
        
        # Get Public URL
        # Supabase Python client returns public URL differently sometimes, 
        # but get_public_url is standard.
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
