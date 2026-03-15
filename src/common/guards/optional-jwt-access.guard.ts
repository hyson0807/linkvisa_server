import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAccessGuard } from './jwt-access.guard';

@Injectable()
export class OptionalJwtAccessGuard extends JwtAccessGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // Auth failed — set user to null and allow access
      const req = context.switchToHttp().getRequest();
      req.user = null;
    }
    return true;
  }
}
