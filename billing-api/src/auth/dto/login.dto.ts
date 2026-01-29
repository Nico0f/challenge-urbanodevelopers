import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'test', description: 'Username for login' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'test', description: 'Password for login' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

