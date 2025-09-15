import { Router } from 'express';
import { logout, refresh, validarToken } from '../controllers/tokenJWT.js';

const r = Router();

r.get('/validarToken', validarToken);

r.post('/logout', logout);

r.post('/refresh', refresh);

export default r;