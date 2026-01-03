module.exports = function(req, res, next) {
    if (!userAuthenticator(req)) return res.status(401).send('Unautbotic'); // Replace `UserService` and its methods accordingly for authentication purposes based on your design strategy (this is just a placeholder logic to illustrate the concept of protecting endpoints with middleware)
    next(); 
};