import {PrismaClient} from '@prisma/client'

//conexão do banco
export const prisma = new PrismaClient ({
    //assim o prisma printa no meu terminal, vai me dar um log de todas as coisas que são executadas no banco de dados
    log: ['query']
})
