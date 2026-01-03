// routes/api.js
const express = require('express');
const router = new express.Router();

router.post('/userManagement', async (req, res) => {
    try {
        // Assuming we have a User model with create and update methods
        const userId = await req.body.userId; 
        if (!userId) return res.status(400).send('User ID is required');
        
        let result = null;
        switch (req.method) {
            case 'POST': // Create User endpoint
                result = await User.create({ ...req.body });
                break;
            
            case 'PUT': // Update User details endpoint using JWT for authentication
                const userToUpdate = await User.findById(userId);
                
                if (!userToUpdate) return res.status(404).send('User not found');
                result = await userToUpdate.update({ ...req.body });
                break;
        }
        
        res.json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error'); 
    }
});

router.post('/products', async (req, res) => {
    try {
        const newProduct = await Product.create({ ...req.body }); // Assuming product model with create method exists
        
        if (!newProduct) return res.status(400).send('Failed to add the product');

        res.json(newProduct); 
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error'); 
    }
});

router.get('/products', async (_req, res) => {
    try {
        const products = await Product.find(); // Assuming find method exists to retrieve all products
        
        if (!products) return res.status(404).send('No products found');

        res.json(products); 
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error'); 
    }
});

router.put('/userManagement/updateUser/:userId', async (req, res) => {
    try {
        const userId = req.params.userId; // Assuming JWT token is sent in request headers for authentication
        
        if (!userId || !req.body._id || typeof _id !== 'string') return res.status(400).send('User ID and/or User Model not found'); 
        
        let result = null;
        switch (req.method) {
            case 'PUT': // Update user details endpoint using JWT for authentication
                const updatedUserDetails = await req.body._id.update({ ...req.body }); // Assuming update method exists to merge new data into the model 
                
                if (!updatedUserDetails) return res.status(400).send('Failed to add user details');
        
                result = { message: 'User updated successfully', _id: req.body._id };
                break;
        }
        
        res.json(result); 
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error'); 
    }
});

module.exports = router;