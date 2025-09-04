const { Module } = require("@nestjs/common");
const { MongooseModule } = require("@nestjs/mongoose");
const { EmailService } = require("./email/email.service");
const { EmailSchema } = require("./email/email.schema");

const AppModule = {
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI),
    MongooseModule.forFeature([{ name: "Email", schema: EmailSchema }]),
  ],
  controllers: [],
  providers: [
    {
      provide: "EmailModel",
      useFactory: (connection) => connection.model("Email", EmailSchema),
      inject: ["MongooseConnection"],
    },
    {
      provide: "EmailService",
      useFactory: (emailModel) => new EmailService(emailModel),
      inject: ["EmailModel"],
    },
  ],
};

module.exports = { AppModule };
