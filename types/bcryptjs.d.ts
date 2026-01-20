declare module "bcryptjs" {
  const bcrypt: {
    compare(plain: string, hash: string): Promise<boolean> | boolean;
    hash(plain: string, saltOrRounds: number): Promise<string> | string;
  };

  export default bcrypt;
}

