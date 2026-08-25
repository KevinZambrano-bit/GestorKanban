"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const microservices_1 = require("@nestjs/microservices");
async function main() {
    const client = microservices_1.ClientProxyFactory.create({
        transport: microservices_1.Transport.TCP,
        options: { host: 'localhost', port: 3001 },
    });
    console.log('Conectando al microservicio IA (TCP localhost:3001)...');
    console.log('Enviando patrón: generate_subtasks\n');
    const result = await client
        .send('generate_subtasks', {
        task: 'Implementar websocket en el proyecto de gestión de tareas para actualizaciones en tiempo real',
    })
        .toPromise();
    console.log('Respuesta recibida:');
    console.log(JSON.stringify(result, null, 2));
    client.close();
}
main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
//# sourceMappingURL=test-client.js.map