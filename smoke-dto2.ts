import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { AddCommentDto } from './apps/analytics-service/src/tasks/dto/add-comment.dto';

async function run(label: string, raw: any) {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true });
  try {
    const result = await pipe.transform(raw, { type: 'body', metatype: AddCommentDto } as any);
    console.log(label, 'OK', result);
  } catch (e: any) {
    console.log(label, 'REJECTED', e.response?.message ?? e.message);
  }
}

async function main() {
  await run('legit body only', { body: 'hi' });
  await run('client tries to spoof authorId', { body: 'hi', authorId: 999 });
}
main();
