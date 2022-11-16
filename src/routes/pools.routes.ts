import { FastifyInstance } from "fastify"
import ShortUniqueId from "short-unique-id"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate"

export async function poolRoutes(fastify: FastifyInstance) {
    //vou ter uma rota de CONTAGEM DE BOLÕES, com uma função anônima, na qual estou buscando algo (GET):
    fastify.get('/pools/count', async () => {

        //pega minha tablela:
        //uso await: espero essa função carregar pra depois o resto do código funcionar.
        const count = await prisma.pool.count()

        return { count }
    })

    //criando um novo bolão/recurso, dentro do padrão RESTFul, por isso POST 
    //preciso de dados vindo da requisição, então uso(request,reply) onde vamos ter acesso aos dados da (requisição e da resposta)

    //pra CRIAR UM BOLÃO preciso que o us envie o titulo
    /*eu tenho minha rota, que é:
    http:localhost/3333/ e oq eu quero, logo ficaia:
    http:localhost:3333/pools/count
    copio a ultima parte e coloco no get */
    fastify.post('/pools', async (request, reply) => {
        //quando preciso notificar ou ter respos. complexa uso o reply

        //digo que o campo {título} nesse caso, não pode ser NULO}
        const createPoolBody = z.object({
            title: z.string({
                required_error: "Title is required",
                invalid_type_error: "Title must be a string"
            }),
        })

        //pego do título do bolão:
        const { title } = createPoolBody.parse(request.body)
        //uso o método de verificar se esta nulo

        //biblio de gerar ID > min 6 digitos
        const generate = new ShortUniqueId({ length: 6 })
        const code = String(generate()).toUpperCase()

        //executo o método pra ver se o usuário ta logado
        await request.jwtVerify();

        try {
            //se passar por isso, ele cria o bolão, onde:
            await prisma.pool.create({
                data: {
                    title,
                    code,
                    ownerId: request.user.sub,
                    //sub: outro ID do usuário que ta guardado dentro do token.

                    //crio participante:
                    participants: {
                        create: {
                            userId: request.user.sub,
                        }
                    }
                }
            })

        } catch {
            //se eu não tenho o usuário autenticado:, eu crio o bolão sem o ownerId:
            await prisma.pool.create({
                data: {
                    title,
                    //converto p string e coloco maiús.
                    code
                }
            })
        }


        //pra dar status sucesso e mandar meu título
        return reply.status(201).send({ code })
    })

    //criar nova rota pra ENTRAR NO BOLÃO:
    //essa rota precisa que o usuário esteja autenticado, para pode acessar.
    fastify.post('/pools/join', {
        onRequest: [authenticate]
    }, async (request, reply) => {
        //pra entrar em um bolão a pessoa precisa digitar o código dele:
        const joinPoolBody = z.object({
            code: z.string(),
        })

        const { code } = joinPoolBody.parse(request.body)

        //processo de validação:
        //começo procurando se eu encontro um bolão com o código digitado:
        const pool = await prisma.pool.findUnique({
            where: {
                code
            },
            include: {
                participants: {
                    //busca a lista de participantes onde o ID do participante seja o usuário logado:
                    where: {
                        userId: request.user.sub
                    }
                }
            }
        })

        if (!pool) {
            //se não tem bolão com o código, retorno erro:
            return reply.status(400).send({
                message: "Pool not found."
            })
        }

        //se retornar algum dado, quer dizer que o usuário já participa do bolão:
        if (pool.participants.length > 0) {
            return reply.status(400).send({
                message: "You already joined this pool."
            })
        }

        //pra versão WEB:
        //usuário estiver tentando participar do bolão e esse ainda não tem um dono:
        if (!pool.ownerId) {
            //coloco o 1º usuário que entra  no bolão como dono:
            await prisma.pool.update({
                where: {
                    id: pool.id,
                },
                data: {
                    ownerId: request.user.sub
                }
            })

        }

        //se TUDO passou, crio a relação com participante:
        await prisma.participant.create({
            data: {
                poolId: pool.id,
                userId: request.user.sub
            }
        })

        return reply.status(201).send()
    })

    //BOLÕES QUE EU PARTICIPO:
    fastify.get('/pools', {
        //ús. precisa estar autenticado:
        onRequest: [authenticate]
    }, async (request) => {

        //quero encontrar vários bolões:
        const pools = await prisma.pool.findMany({
            //ONDE
            where: {
                //quero encontrar all bolões que tem PELO MENOS 1 participante com ID do ús logado:
                participants: {
                    some: {
                        userId: request.user.sub
                    }
                }
            },
            //como na versão mobile uma das partes é mostrar:
            include: {
                //quantos participantes tem:
                _count: {
                    select: {
                        participants: true
                    }
                },
                //fotinhos dos 4 primeiros a criar bolão:
                participants: {
                    select: {
                        //pego ús por id
                        id: true,

                        //por a tbl participantes ter relacionamento com a User, consigo pegar o avatar por aqui mesmo:
                        user: {
                            select: {
                                avatarUrl: true
                            }
                        }
                    },
                    //quantos eu quero:
                    take: 4
                },

                // o nome de quem criou o bolão:
                owner: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        return { pools }
    })

    //DETALHES DO BOLÃO (ús entra em 1 bolão específico):
    fastify.get('/pools/:id', {
        onRequest: [authenticate],
    }, async (request) => {
        const getPoolParams = z.object({
            id: z.string(),
        })

        const { id } = getPoolParams.parse(request.params)

        const pool = await prisma.pool.findUnique({
            //ONDE
            where: {
                //posso encontrar o bolão pelo ID
                id,
            },
            include: {
                _count: {
                    select: {
                        participants: true
                    }
                },
                participants: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                avatarUrl: true
                            }
                        }
                    },
                    take: 4
                },
                owner: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })
        return { pool }

    })
}