import requests

BASE_URL = "http://localhost:8000/api/v1"

def verify_tts():
    print("Testing TTS Endpoint...")
    text = "Xin chào, đây là giọng đọc thử nghiệm từ AI."
    
    try:
        response = requests.post(f"{BASE_URL}/tts/speak", json={"text": text}, stream=True)
        
        if response.status_code == 200:
            print("Success! Received audio stream.")
            content_type = response.headers.get("content-type")
            print(f"Content-Type: {content_type}")
            
            if content_type == "audio/mpeg":
                print("PASS: Correct content type.")
                # Save to file to verify manually if needed
                with open("test_tts.mp3", "wb") as f:
                    for chunk in response.iter_content(chunk_size=1024):
                        f.write(chunk)
                print("Saved audio to test_tts.mp3")
            else:
                print(f"FAIL: Incorrect content type: {content_type}")
        else:
            print(f"FAIL: Status code {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"FAIL: Exception occurred: {e}")

if __name__ == "__main__":
    verify_tts()
