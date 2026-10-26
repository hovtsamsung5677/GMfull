import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PanelStatusBroadcasterService } from './panel-status-broadcaster.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: 'panels',
})
export class PanelsGateway implements OnGatewayInit {
  private readonly logger = new Logger(PanelsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly broadcaster: PanelStatusBroadcasterService) {}

  afterInit(server: Server): void {
    this.broadcaster.setServer(server);
    this.logger.log(
      "Panels gateway initialized; panel status updates will be broadcast on event 'panelStatusUpdated'",
    );
  }
}
