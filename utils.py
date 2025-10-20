import requests


def download_audio(url):
    response = requests.get(url)
    audio_file_path = 'temp_audio.wav'
    with open(audio_file_path, 'wb') as f:
        f.write(response.content)
    return audio_file_path