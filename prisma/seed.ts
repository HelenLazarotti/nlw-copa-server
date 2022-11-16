import { PrismaClient } from '@prisma/client'

//vou fazer conexão com o banco:
const prisma = new PrismaClient()

async function main() {

    //crio um usuário:
    const user = await prisma.user.create({
        data: {
            name: '',
            email: '',
            avatarUrl: '',//se eu fazer assim, pega minha fotodo github.
        }
    })

    //crio um bolão:
    const pool = await prisma.pool.create({
        data: {
            title: '',
            code: '',
            ownerId: user.id, //to dizendo que o usuário que cirei ali acima, éo dono desse bolão

            //como no banco eu tenho um relacionamento dentro da tabela pool com participants, consigo criar por aqui mesmo

            //assim consigo criar o bolão e o participante ao mesmo tempo

            participants: {
                create: {
                    userId: user.id
                }
            }
        }
    })

    //crio um game com palpite criado:
    await prisma.game.create({
        data: {
            date: '2022-11-02T17:31:50.399Z',//sempre que for salvar datas no banco, salavar com timeStemp

            firstTeamCountryCode: 'DE',
            secondTeamCountryCode: 'BR',
        }
    })

    //crio um game sem palpite:

    await prisma.game.create({
        data: {
            date: '2022-11-03T17:31:50.399Z',
            firstTeamCountryCode: 'BR',
            secondTeamCountryCode: 'AR',

            //crio palpite pro jogo, como fiz com participants acima:
            guesses: {
                create: {
                    firstTeamPoints: 2,
                    secondTeamPoints: 1,

                    //como criei um participante ali em cima eu conecto:

                    participant: {
                        connect: {
                            userId_poolId: {
                                userId: user.id,
                                poolId: pool.id
                            }
                        }
                    }
                }
            }
        }
    })
}

main()
