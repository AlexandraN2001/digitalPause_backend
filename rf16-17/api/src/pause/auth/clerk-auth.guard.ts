import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const clerkId = req.headers["x-clerk-id"];
    if (!clerkId || typeof clerkId !== "string") {
      throw new UnauthorizedException("Falta header x-clerk-id (temporal).");
    }

    req.user = { clerkId };
    return true;
  }
}
