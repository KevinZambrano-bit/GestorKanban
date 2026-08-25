"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const common_1 = require("@nestjs/common");
const ai_module_1 = require("./ai.module");
async function bootstrap() {
    const app = await core_1.NestFactory.createMicroservice(ai_module_1.AiModule, {
        transport: microservices_1.Transport.TCP,
        options: {
            host: '0.0.0.0',
            port: 3001,
        },
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
    }));
    await app.listen();
}
void bootstrap();
//# sourceMappingURL=main.js.map