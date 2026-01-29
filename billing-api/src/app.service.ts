import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Billing Challenge API - Sistema de Facturación por Lote';
  }
}

