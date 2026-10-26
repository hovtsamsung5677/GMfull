import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { PanelStatusPayload } from './dto/panel-heartbeat.dto';

@Injectable()
export class PanelStatusBroadcasterService {
  private readonly logger = new Logger(PanelStatusBroadcasterService.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
    this.logger.log('WebSocket server bound to panel status broadcaster');
  }

  publishPanelStatus(payload: PanelStatusPayload): void {
    if (this.server === null) {
      this.logger.warn('Cannot publish panel status: WebSocket server is not initialized');
      return;
    }

    this.server.emit('panelStatusUpdated', payload);
    this.logger.debug(`Published panel status update for panel ${payload.id} (${payload.status})`);
  }
}
