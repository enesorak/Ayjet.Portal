import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/config';

class SignalRService {
    private connection: HubConnection | null = null;

    public startConnection() {
        const authStore = useAuthStore();
        if (!authStore.token || this.connection) {
            return;
        }

        this.connection = new HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/notificationHub`, {
                accessTokenFactory: () => authStore.token!
            })
            .configureLogging(LogLevel.Information)
            .build();

        this.connection.start()
            .then(() => console.log('SignalR Connected.'))
            .catch(err => console.error('SignalR Connection Error: ', err));
    }

    public onScoreUpdate(callback: (message: string, assignmentId: string) => void) {
        this.connection?.on('ReceiveScoreUpdate', callback);
    }
}

export const signalRService = new SignalRService();