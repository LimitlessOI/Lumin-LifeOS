```javascript
module.exports = (req, res, next) => {
    const userRole = req.user.role; // Assuming user role is set in req.user
    if (userRole === 'admin' || userRole === 'instructor') {
        return next();
    }
    return res.status(403).json({ error: 'Access denied' });
};
```