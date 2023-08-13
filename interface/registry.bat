@ECHO OFF
REG ADD HKLM\SOFTWARE\Mozilla\NativeMessagingHosts\com.ajowsentry.chessanalyzer.engine /t REG_SZ /d %cd%\messaging-proxy.json