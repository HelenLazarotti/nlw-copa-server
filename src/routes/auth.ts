import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import fetch from "node-fetch";
import { authenticate } from "../plugins/authenticate";

export async function authRoutes(fastify: FastifyInstance) {

    //retorna infos do usuário logado:
    fastify.get('/me', {
        onRequest: [authenticate]
    }, async (request) => {
        return { user: request.user }
    })

    //criando usuário para autenticação de login:
    fastify.post("/users", async (request) => {

        //validar a entrada de dados no back-end, SEMPRE:
        const createUserBody = z.object({
            //espero que no corpor da requisição, tenha o meu acess_token:
            access_token: z.string({
                required_error: "Title is required",
                invalid_type_error: "Title must be a string",
            }),
            //com esse acess token eu consigo me comunicar com a API do Google, pra obter informações do usuário, como email, nome, ID, etc... pra identificar esse usuário e criar um ID pra ele dentro do meu banco de dados.
        })

        //preciso pegar de dentro do meu body, o meu token de acesso:
        const { access_token } = createUserBody.parse(request.body)
        console.log(access_token);

        //agora chamo a API do Google:
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo",
            {
                //quando eu chamo ela com GET:
                method: 'GET',
                headers: {
                    //e enviando um cabeçalho de autorização, meu access_token que veio do ambiente mobile:
                    Authorization: `Bearer ${access_token}`,
                }
            })

        //vou transformar em JSON:
        const userData = await userResponse.json()
        console.log(userData)
        //uso o xood pra validar que vai vir essas infos do google:
        const userInfoSchema = z.object({
            //google vai nos devolver as informações de:
            id: z.string(),
            email: z.string().email(),
            name: z.string(),
            picture: z.string().url()
        })

        //verifico se as infos vindas do google realmente batem com userInfoSchema.
        const userInfo = userInfoSchema.parse(userData)


        //vou tentar procurar um usuário no prisma(banco de dados)
        let user = await prisma.user.findUnique({
            //vou tentar encontrar o usuário onde o googleID(da minha tabela) for igual ao userInfo id:
            where: {
                googleId: userInfo.id
            }
        })

        //agora vejo se o ús. já existe no meu banco:
        if (!user) {
            //se não existe eu crio um:
            user = await prisma.user.create({
                //passo all campos que preciso criar:
                data: {
                    googleId: userInfo.id,
                    name: userInfo.name,
                    email: userInfo.email,
                    avatarUrl: userInfo.picture
                }
            })
        }

        //crio token pro usuáio:
        const token = fastify.jwt.sign({
            //coloco informações dentro do token:
            name: user.name,
            avatarUrl: user.avatarUrl,
        }, {
            //quem gerou o token:
            sub: user.id,
            expiresIn: '1 day'
        })

        return { token }
    })

} 
