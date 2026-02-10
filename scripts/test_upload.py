import requests
import os
import time

# Configuration
API_URL = "http://localhost:3000/api/hooks/upload-washed-reel"
API_SECRET = "ayush"  # Matches your .env
USER_ID = "25420744910952036" # Updated with valid ID (flexhunt_)
VIDEO_PATH = "generated_video (6).mp4" # Using your uploaded file

def test_upload():
    # create_dummy_video() # Skipped, using real file
    
    headers = {
        "x-api-secret": API_SECRET
    }
    
    files = {
        'file': (VIDEO_PATH, open(VIDEO_PATH, 'rb'), 'video/mp4')
    }
    
    data = {
        'caption': 'Test automation upload 🚀 #testing',
        'userId': USER_ID
    }
    
    print(f"Uploading to {API_URL}...")
    try:
        response = requests.post(API_URL, headers=headers, files=files, data=data)
        
        print(f"Status Code: {response.status_code}")
        try:
            print("Response JSON:", response.json())
        except:
            print("Response Text:", response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_upload()
