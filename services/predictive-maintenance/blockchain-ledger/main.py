```python
from hfc.fabric import Client

def record_maintenance_transaction(asset_id, record_data):
    client = Client(net_profile="network.json")
    client.new_channel('mychannel')
    transaction = client.chaincode_invoke(
        requestor='Admin',
        channel_name='mychannel',
        peers=['peer0.org1.example.com'],
        args=[asset_id, record_data],
        cc_name='maintenancecc',
        fcn='createMaintenanceRecord'
    )
    return transaction

if __name__ == "__main__":
    transaction = record_maintenance_transaction('1', '{"status": "completed"}')
    print("Transaction ID:", transaction)
```