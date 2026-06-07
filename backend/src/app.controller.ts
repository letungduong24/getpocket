import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// Dummy comment to trigger seeder reload 2
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
