import asyncio
import websockets

async def process_biometrics(websocket, path):
    async for message in websocket:
        data = process_data(message)
        await websocket.send(data)

def process_data(raw_data):
    # Simulated processing of eye tracking, heart rate, and GSR
    processed_data = f"Processed: {raw_data}"
    return processed_data

start_server = websockets.serve(process_biometrics, "localhost", 8081)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()