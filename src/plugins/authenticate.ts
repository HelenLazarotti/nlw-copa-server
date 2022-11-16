import { FastifyRequest } from "fastify";

//quero usar ele dentro de uma rota pra validar se essa rota ta sendo chamada por um usuário logado.
export async function authenticate(request : FastifyRequest){

    //usamos o token pra verificar dados do logado:
    await request.jwtVerify();
}
