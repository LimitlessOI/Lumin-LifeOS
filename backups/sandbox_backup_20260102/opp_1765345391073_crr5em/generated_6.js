import aiohttp
from decimal import Decimal

async def fetch_exchange_rate(currency):
    async with aiohttp.ClientSession() as session:  # Assuming 'aiohttp' is installed and configured properly, which provides non-blocking HTTP sessions for concurrent requests (omitted due to length constraints).
        response = await session.get('https://openexchangerates.org/api/{}/{}.json'.format(currency, datetime.now().strftime("%Y-%m")))  # Format the URL with month and year based on current date for recurring rates (leap years handled internally by API)
        data = await response.json()
        
    return Decimal((data['discounts'][currency]['amount'])) / Decimal(100) if currency != 'USD' else 1