import React from "react";
import { PublicKey, Transaction , TransactionSignature} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";

import { notify } from "../utils/notifications";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export const mintTokens = async (
  tokenMintAddress: string,
  receiverAddress: string,
  amount: string,
  connection,
  publicKey,
  sendTransaction,
): Promise<void> => {
  try {
    // Подключаемся к кошельку и сети

    // Проверяем, подключён ли кошелёк
    if (!publicKey) {
      notify({ type: "error", message: "Wallet not connected!" });
      console.log("error", "Send Transaction: Wallet not connected!");
      return;
    }

    // Проверяем, переданы ли все необходимые данные
    if (!tokenMintAddress || !receiverAddress || !amount) {
      notify({ type: "error", message: "Missing required fields!" });
      console.log("error", "Send Transaction: Missing required fields!");
      return;
    }

    // Преобразуем данные в строки и подготавливаем PublicKey
    const tokenMintPubkey = new PublicKey(String(tokenMintAddress).trim());
    const receiverPubkey = new PublicKey(String(receiverAddress).trim());
    const amountValue = parseFloat(String(amount).trim());

    // Проверяем, корректно ли передано количество токенов
    if (isNaN(amountValue) || amountValue <= 0) {
      notify({ type: "error", message: "Invalid amount value!" });
      console.log("error", "Send Transaction: Invalid amount value!");
      return;
    }

    let signature: TransactionSignature = ""; // Для записи подписи транзакции
    const transaction = new Transaction(); // Создаём новую транзакцию

    // Получаем информацию о токене
    const mintAccountInfo = await getMint(connection, tokenMintPubkey);
    const decimals = mintAccountInfo.decimals;

    // Получаем или создаём связанный токен-аккаунт для получателя
    const tokenReceiverAccount = await getAssociatedTokenAddress(
      tokenMintPubkey,
      receiverPubkey,
      true
    );

    const receiverAccountInfo = await connection.getAccountInfo(
      tokenReceiverAccount
    );

    // Если токен-аккаунт не существует, создаём его
    if (!receiverAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          publicKey, // Плательщик
          tokenReceiverAccount, // Новый связанный аккаунт
          receiverPubkey, // Получатель
          tokenMintPubkey // Адрес токена
        )
      );
    }

    // Добавляем инструкцию для чеканки токенов
    transaction.add(
      createMintToInstruction(
        tokenMintPubkey, // Адрес токена
        tokenReceiverAccount, // Аккаунт получателя
        publicKey, // Выполняющий чеканку
        Math.floor(amountValue * 10 ** decimals) // Количество токенов с учётом десятичных знаков
      )
    );

    // Отправляем транзакцию
    signature = await sendTransaction(transaction, connection);

    // Уведомляем об успешной транзакции
    notify({
      type: "success",
      message: "Transaction successful!",
      txid: signature,
    });
    console.log("Transaction successful! Signature:", signature);
  } catch (error: any) {
    // Обрабатываем ошибки
    notify({
      type: "error",
      message: "Transaction failed!",
      description: error?.message,
    });
    console.log("Transaction failed!", error?.message);
  }
};