"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireProjectRole = exports.PROJECT_ROLE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PROJECT_ROLE_KEY = 'projectRole';
const RequireProjectRole = (...roles) => (0, common_1.SetMetadata)(exports.PROJECT_ROLE_KEY, roles);
exports.RequireProjectRole = RequireProjectRole;
//# sourceMappingURL=project-role.decorator.js.map