import { ClientProxyFactory, Transport } from '@nestjs/microservices';

async function main() {
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: 'localhost', port: 3001 },
  });

  console.log('Conectando al microservicio IA (TCP localhost:3001)...');
  console.log('Enviando patrón: generate_subtasks\n');

  const result = await client
    .send('generate_subtasks', {
      task: 'Implementar autenticación JWT',
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
