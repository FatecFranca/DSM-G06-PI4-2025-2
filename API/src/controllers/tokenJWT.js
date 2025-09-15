import { prisma } from "../prisma.js";
import jwt from "jsonwebtoken";

// Validar
// Verificar se token ainda está valido
export async function validarToken(req, res) {
    try {

        if (! await verificarToken(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }else{
            return res.status(200).json({ ok: true, message: 'Token válido. Usuário autenticado' });
        }

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao realizar login' });
    } finally {
        await prisma.$disconnect();
    }
}

const verificarTokenDoCorpo = (req) => {
    try {
        return req.body.token;
    } catch {
        return null;
    }
};

// Validar
// Esta rota recebe um Refresh Token e o adiciona à blacklist
// para que ele não possa mais ser usado, mesmo que não tenha expirado.
export async function logout(req, res) {
    try {

        const refreshToken = verificarTokenDoCorpo(req);

        if (!refreshToken) {
            return res.status(400).json({ ok: false, message: 'Token de refresh não fornecido.' });
        }

        // Tenta adicionar o token à tabela de tokens revogados
        await prisma.tokensRevogados.create({
            data: {
                token: refreshToken
            }
        });

        // O token foi revogado com sucesso.
        return res.status(200).json({ ok: true, message: 'Sessão encerrada com sucesso.' });

    } catch (e) {
        // Se o token já estiver na tabela, o Prisma lançará um erro de violação de chave primária.
        // Neste caso, tratamos como sucesso, pois o token já estava revogado.
        if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
            return res.status(200).json({ ok: true, message: 'Sessão já estava encerrada.' });
        }
        
        console.error("Erro ao revogar o token:", e);
        return res.status(500).json({ error: 'Erro interno do servidor.' });

    } finally {
        await prisma.$disconnect();
    }
}

//  Validar
// Esta rota recebe um Refresh Token e, se ele for válido e não estiver revogado,
// gera um novo Access Token para o cliente.
export async function refresh(req, res) {
    try {

        const refreshToken = verificarTokenDoCorpo(req);

        if (!refreshToken) {
            return res.status(400).json({ ok: false, message: 'Token de refresh não fornecido.' });
        }

        // 1. Verifica se o token está na lista de revogados (blacklist)
        const tokenRevogado = await prisma.tokensRevogados.findUnique({
            where: { token: refreshToken }
        });

        if (tokenRevogado) {
            return res.status(401).json({ ok: false, message: 'Token de refresh revogado.' });
        }

        // 2. Verifica se o token de refresh é válido e não está expirado.
        const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);

        // Se a verificação acima falhar, a execução é interrompida e o catch é ativado.

        // 3. Se o token for válido e não estiver revogado, gera um novo Access Token
        const newAccessToken = jwt.sign({ userId: decoded.userId }, process.env.SECRET_KEY, { expiresIn: '15m' });

        return res.status(200).json({
            ok: true,
            message: 'Access token renovado com sucesso.',
            accessToken: newAccessToken
        });

    } catch (e) {
        // Trata tokens inválidos (ex: assinatura inválida, expirado)
        if (e.name === 'TokenExpiredError') {
            return res.status(401).json({ ok: false, message: 'Token de refresh expirado. Por favor, faça login novamente.' });
        }
        
        console.error("Erro ao renovar o token:", e);
        return res.status(401).json({ ok: false, message: 'Token de refresh inválido.' });
        
    } finally {
        await prisma.$disconnect();
    }
}