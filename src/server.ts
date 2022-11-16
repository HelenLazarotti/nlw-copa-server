//importo o fastify:
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { poolRoutes } from './routes/pools.routes'
import { userRoutes } from './routes/users.routes'
import { guessesRoutes } from './routes/guesses.routes'
import { authRoutes } from './routes/auth'
import { gameRoutes } from './routes/games.routes'

//singleton é um pattern -> função que não precisa ser criada e sim reaproveitada dentro dos arquivos

//crio uma função assícrona:
//vai ser a 1º função que vai ser executada pelo nosso código.
async function bootstrap() {

    //crio o servidor:
    const fastify = Fastify({
        //pra ir soltando logs de all q ta acontecendo na aplicação:
        logger: true,
    })

    await fastify.register(cors, {
        //permmite que qualquer aplicação acesse nosso backend
        origin: true,
    })

    await fastify.register(jwt, {
        //o back-end precisa ter uma chave secreta pra gerar/validar o token:
        secret: 'nlwcopa'
    })

    //chamo todos meus routes
    await fastify.register(poolRoutes)
    await fastify.register(userRoutes)
    await fastify.register(guessesRoutes)
    await fastify.register(authRoutes)
    await fastify.register(gameRoutes)

    //passo a porta que quero minha aplicação executando:
    await fastify.listen({port: 5555, host: '0.0.0.0'})
}

bootstrap()
