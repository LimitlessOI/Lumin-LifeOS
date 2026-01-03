// routes/api.js
const express = require('express');
const router = express.Router();

router.get('/systems', async function(req, res){
    // Implement API logic to get systems info from our database or another source here...
});

router.post('/login_request', (req,res) => {
  const { email, password } = req.body;
  
  if (!email || !password ) return res.status(400).send({message: 'Please complete all required fields.' }); // Basic form validation with Joi to ensure mandatory params are provided (omitted for brevity)
    const userInfoSchema = new mongoose.Schema({ email, password }) 
    
    User.findOne({email : email}, function(err, users){
      if(!users || err){ // Validation that checks username/password match in database and returns a specific error message accordingly (omitted for brevity)
        return res.status(400).send({message: 'Invalid credentials'}) 
    })
   .then((userInfo)=>{
      const jwtToken = generateJWTtoken(); // Assuming we have JWT token generation logic here...
      
      if(!users){
          throw new Error('User not found');
     0} else {
        req.session.userId= userId;
         res.send({  status:200, message:'Logged in successfully' });    
      }  
    })
    .catch(err => console hall the appropriate error handling)
});