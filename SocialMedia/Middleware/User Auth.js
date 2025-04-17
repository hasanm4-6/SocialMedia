const jwt = require('jsonwebtoken')
const userSecretKEY = "SeCrEtKeY"

const authenticateUser = (req, res, next) => {
    const authHeader = req.headers['authorization']

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token is missing or invalid' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, userSecretKEY)
        req.user = decoded
        next()
    } 
    catch (error) {
        res.status(401).json({ error: 'Invalid token' })
    }
}
module.exports = authenticateUser