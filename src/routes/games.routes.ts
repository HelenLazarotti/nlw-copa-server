import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate"

export async function gameRoutes(fastify: FastifyInstance) {

    fastify.get('/games/count', async () => {
        const count = await prisma.guess.count()
    
        return { count }
      })

    fastify.get('/pools/:id/games', {
        onRequest: [authenticate],
    }, async (request) => {
        const getPoolParams = z.object({
            id: z.string(),
        })

        const { id } = getPoolParams.parse(request.params)

        //quero encontrar todos os games possíveis:
        const games = await prisma.game.findMany({

            //ordenar os jogos:
            orderBy: {
                //por data de criação em forma decresente:
                date: 'desc'
                //pra mostrar no topo os jogos mais recentemente adicionados
            },

            //preciso do ID do bolão porque o palpite em 1 jogo pode ser diferente em cada bolão
            include: {
                guesses: {
                    where: {
                        participant: {
                            //tenha o id do ús logado:
                            userId: request.user.sub,
                            //id do bolão seja oq eu to recebendo no parâmetro
                            poolId: id,
                        }
                    }
                }
            }

        })

        //ao invés de retornar um array, pois o participante não pode dar mais de 1 palpite no mesmo jogo, eu:
        return {
            games: games.map(game => {
                //pego um array e retorno:
                return {
                    //todas as informações que já existem dentro do game, pra não ter que ficar repetindo cada uma delas
                    ...game,

                    //se dentro do array de palpites eu tiver alguma info eu retorno apenas a 1º info ali de dentro, e se não exitir retorno nulo:
                    guess: game.guesses.length > 0 ? game.guesses[0] : null,

                    //some do array
                    guesses: undefined,
                }
            })
        }
    })
}
