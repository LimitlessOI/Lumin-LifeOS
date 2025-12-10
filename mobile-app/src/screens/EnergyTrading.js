```javascript
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const EnergyTrading = () => {
    return (
        <View style={styles.container}>
            <Text>Energy Trading</Text>
            <Button title="Trade Energy" onPress={() => alert('Trade initiated!')} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default EnergyTrading;
```