// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true }, 
    password: String // TODO: add hashed passwords before saving and comparing against the database for authentication purposes (should not be stored in memory)
});

userSchema.methods.comparePassword = function(candidatePassword){
    return bcrypt.compareSync(candidatePassword, this.password); 
};

module.exports = mongoose.model('User', userSchema);