"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireGlobalRole = exports.GLOBAL_ROLE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.GLOBAL_ROLE_KEY = 'globalRole';
const RequireGlobalRole = (...roles) => (0, common_1.SetMetadata)(exports.GLOBAL_ROLE_KEY, roles);
exports.RequireGlobalRole = RequireGlobalRole;
//# sourceMappingURL=global-role.decorator.js.map