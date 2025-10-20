import requests
import openai
from database import update_lead_status, create_follow_up_task


def download_audio(url):
    response = requests.get(url)
    if response.status_code == 200:
        with open('audio.mp3', 'wb') as f:
            f.write(response.content)
        return 'audio.mp3'
    else:
        raise Exception('Failed to download audio')


def transcribe_audio(file_path):
    with open(file_path, 'rb') as audio_file:
        transcript = openai.Audio.transcribe(model='whisper-1', file=audio_file)
    return transcript['text']


def analyze_transcript(transcript):
    # Use GPT-4 to analyze the transcript
    response = openai.ChatCompletion.create(
        model='gpt-4',
        messages=[
            {'role': 'user', 'content': f'Analyze this call transcript and extract interest_level, objections, next_best_action: {transcript}'}
        ]
    )
    return response['choices'][0]['message']['content']


def analyze_call(audio_url):
    audio_file_path = download_audio(audio_url)
    transcript = transcribe_audio(audio_file_path)
    analysis = analyze_transcript(transcript)
    # Assume analysis is a dictionary with the required fields
    update_lead_status(analysis['lead_id'], analysis['interest_level'])
    create_follow_up_task(analysis['lead_id'], analysis['next_best_action'])
    return analysis
