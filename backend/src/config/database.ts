// src/config/database.ts
import mongoose from 'mongoose';

/**
 * Enmascara la contraseña en una URI de MongoDB para imprimirla de manera segura en consola.
 */
const maskMongoUri = (uri: string): string => {
  return uri.replace(/:([^:@]+)@/, ':****@');
};

export const connectDatabase = async (uri: string): Promise<void> => {
  const maskedUri = maskMongoUri(uri);
  console.log(`🔌 [Database]: Conectando a ${maskedUri}...`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('🔄 [Database]: Conexión exitosa a MongoDB');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error crítico al conectar a la base de datos:', errorMsg);

    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('127.0.0.1')) {
      console.error('💡 Causa probable: No se está leyendo el .env');
    } else if (errorMsg.includes('querySrv ENOTFOUND')) {
      console.error('💡 Causa probable: Revisa el nombre del cluster o tu DNS/red');
    } else if (errorMsg.includes('bad auth') || errorMsg.toLowerCase().includes('authentication failed')) {
      console.error('💡 Causa probable: Usuario o contraseña incorrectos (Atlas > Database Access)');
    } else if (errorMsg.includes('Server selection timed out') || errorMsg.includes('timed out')) {
      console.error('💡 Causa probable: Tu IP no está autorizada (Atlas > Network Access)');
    }

    process.exit(1);
  }
};
