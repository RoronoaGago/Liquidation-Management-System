import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import websocketService from '../services/websocketService';

interface UseWebSocketOptions {
  onNotification?: (data: any) => void;
  onLiquidationReminder?: (data: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { user } = useAuth();
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const handleNotification = useCallback((data: any) => {
    if (optionsRef.current.onNotification) {
      optionsRef.current.onNotification(data);
    }
  }, []);

  const handleLiquidationReminder = useCallback((data: any) => {
    if (optionsRef.current.onLiquidationReminder) {
      optionsRef.current.onLiquidationReminder(data);
    }
  }, []);

  const handleConnected = useCallback(() => {
    if (optionsRef.current.onConnected) {
      optionsRef.current.onConnected();
    }
  }, []);

  const handleDisconnected = useCallback(() => {
    if (optionsRef.current.onDisconnected) {
      optionsRef.current.onDisconnected();
    }
  }, []);

  const handleError = useCallback((error: any) => {
    if (optionsRef.current.onError) {
      optionsRef.current.onError(error);
    }
  }, []);

  useEffect(() => {
    if (!user?.user_id) {
      return;
    }

    // Set up event listeners
    websocketService.on('notification', handleNotification);
    websocketService.on('liquidation_reminder', handleLiquidationReminder);
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);

    // Connect to WebSocket
    websocketService.connect(user.user_id.toString());

    // Cleanup on unmount
    return () => {
      websocketService.off('notification', handleNotification);
      websocketService.off('liquidation_reminder', handleLiquidationReminder);
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
      websocketService.disconnect();
    };
  }, [user?.user_id, handleNotification, handleLiquidationReminder, handleConnected, handleDisconnected, handleError]);

  const sendMessage = useCallback((data: any) => {
    websocketService.send(data);
  }, []);

  const isConnected = useCallback(() => {
    return websocketService.isConnected();
  }, []);

  return {
    sendMessage,
    isConnected,
  };
};
