import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { ChangeEvent, FC, useCallback, useState, useEffect} from "react";
import { notify } from "utils/notifications";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "contexts/NetworkConfigurationProvider";

import { PinataSDK } from "pinata-web3";
import { INPUT_FLOAT_REGEX } from "../constants";
import {
  AuthorityType,
  createSetAuthorityInstruction,
} from "@solana/spl-token";

export const CreateToken: FC = () => {
  
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { networkConfiguration } = useNetworkConfiguration();

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenUri, setTokenUri] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState("9");
  const [tokenMintAddress, setTokenMintAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

    const [imageFile, setImageFile] = useState(null);
  
  
    const [tokenDescription, setTokenDescription] = useState("");
    const [jsonUri, setJsonUri] = useState("");
  
    const JWT_IPFS_TOKEN  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI2ZTg3NjJlNC0xOGY4LTQwMzgtYTRiMy1jMTFkMTI4NDJiZjYiLCJlbWFpbCI6ImFmZmlsaWF0ZWtpeEBtYWlsLnJ1IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjJiMTI0MTI5Y2E2YTJmNjgzYTU3Iiwic2NvcGVkS2V5U2VjcmV0IjoiMjRlMjRmZGIxMTgzMjQ2ZWU2OGYyZWJhOTA4ZDYwM2U4Mzg0MTg3NjI4OTMwOGQwZWI2NDE4ODc2MDk0YmQ0ZCIsImV4cCI6MTc3MzU3OTcxOX0.zuu_Dt7gu8PZFJETVS61umGIRgbShQZATAen-cWRweM"
  
  

    const handleImageChange = (event) => {
      const file = event.target.files[0];
      if (file) {
        setImageFile(file);
      }
    };
  
    const uploadMetadata = async () => {
      const pinata = new PinataSDK({
        pinataJwt: JWT_IPFS_TOKEN,
      });
  
  
      setIsLoading(true);
      try {
        const imageUploadResponse = await pinata.upload.file(imageFile);
        const ipfsImageUri = `https://ipfs.io/ipfs/${imageUploadResponse.IpfsHash}`;
  
        const json = {
          name: tokenName,
          symbol: tokenSymbol,
          description: tokenDescription,
          image: ipfsImageUri,
        };
        const jsonBlob = new Blob([JSON.stringify(json)], {
          type: "application/json",
        });
        const jsonFileName = "uri.json";
        const jsonFile = new File([jsonBlob], jsonFileName);
        const jsonUploadResponse = await pinata.upload.file(jsonFile);
        const ipfsJsonUri = `https://ipfs.io/ipfs/${jsonUploadResponse.IpfsHash}`;
        setJsonUri(ipfsJsonUri);
      } catch (error: any) {
        notify({ type: "error", message: "Upload failed" });
      }
      setIsLoading(false);
    };

  /*  
  const createToken = useCallback(async () => {
    if (!publicKey) {
      notify({ type: "error", message: `Wallet not connected!` });
      return;
    }

    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const mintKeypair = Keypair.generate();

    setIsLoading(true);
    try {
      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),

        createInitializeMintInstruction(
          mintKeypair.publicKey,
          Number(tokenDecimals),
          publicKey,
          publicKey,
          TOKEN_PROGRAM_ID,
        ),

        createCreateMetadataAccountV3Instruction(
          {
            metadata: (
              await PublicKey.findProgramAddress(
                [
                  Buffer.from("metadata"),
                  PROGRAM_ID.toBuffer(),
                  mintKeypair.publicKey.toBuffer(),
                ],
                PROGRAM_ID,
              )
            )[0],
            mint: mintKeypair.publicKey,
            mintAuthority: publicKey,
            payer: publicKey,
            updateAuthority: publicKey,
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                name: tokenName,
                symbol: tokenSymbol,
                uri: tokenUri,
                creators: null,
                sellerFeeBasisPoints: 0,
                collection: null,
                uses: null,
              },
              isMutable: false,
              collectionDetails: null,
            },
          },
        ),
      );
      const signature = await sendTransaction(tx, connection, {
        signers: [mintKeypair],
      });
      setTokenMintAddress(mintKeypair.publicKey.toString());
      notify({
        type: "success",
        message: "Token creation successful",
        txid: signature,
      });
    } catch (error: any) {
      notify({ type: "error", message: "Token creation failed" });
    }
    setIsLoading(false);
  }, [
    publicKey,
    connection,
    tokenDecimals,
    tokenName,
    tokenSymbol,
    tokenUri,
    sendTransaction,
  ]);
*/

const [stapCreateToken, setstapCreateToken] = useState(false);
const [staponClick, setstaponClick] = useState(false);
const [staponClickAuthority, setstaponClickAuthority] = useState(false);

const [amount, setAmount] = useState("0.0");

const createToken = useCallback(async () => {
  if (!publicKey) {
    notify({ type: "error", message: `Wallet not connected!` });
    return;
  }

  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const mintKeypair = Keypair.generate();

  setIsLoading(true);
  try {
    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),

      createInitializeMintInstruction(
        mintKeypair.publicKey,
        Number(tokenDecimals),
        publicKey,
        publicKey,
        TOKEN_PROGRAM_ID,
      ),

      createCreateMetadataAccountV3Instruction(
        {
          metadata: (
            await PublicKey.findProgramAddress(
              [
                Buffer.from("metadata"),
                PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
              ],
              PROGRAM_ID,
            )
          )[0],
          mint: mintKeypair.publicKey,
          mintAuthority: publicKey,
          payer: publicKey,
          updateAuthority: publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: tokenName,
              symbol: tokenSymbol,
              uri: tokenUri,
              creators: null,
              sellerFeeBasisPoints: 0,
              collection: null,
              uses: null,
            },
            isMutable: false,
            collectionDetails: null,
          },
        },
      ),
    );

    const signature = await sendTransaction(tx, connection, {
      signers: [mintKeypair],
    });

    setstapCreateToken(true)

    setTokenMintAddress(mintKeypair.publicKey.toString());
    notify({
      type: "success",
      message: "Token creation successful",
      txid: signature,
    });
  } catch (error: any) {
    notify({ type: "error", message: "Token creation failed" });
    console.error("Error creating token:", error.message);
  } finally {
    setIsLoading(false);
  }
}, [
  publicKey,
  connection,
  tokenDecimals,
  tokenName,
  tokenSymbol,
  tokenUri,
  sendTransaction,
]);

const tokenInputValidation = useCallback((e: ChangeEvent<HTMLInputElement>) => {
  const res = new RegExp(INPUT_FLOAT_REGEX).exec(e.target.value);
  if (res) setAmount(e.target.value);
}, []);

const receiverAddress = publicKey?.toBase58() || null;


const onClick = useCallback(async () => {
  if (!publicKey) {
    notify({ type: "error", message: `Wallet not connected!` });
    console.log("error", `Send Transaction: Wallet not connected!`);
    return;
  }

  let signature: TransactionSignature = "";
  const transaction = new Transaction();
  
  try {
    const tokenMintPubkey = new PublicKey(tokenMintAddress);
    const receiverPubkey = new PublicKey(receiverAddress);

    const mintAccountInfo = await getMint(connection, tokenMintPubkey);
    const decimals = mintAccountInfo.decimals;

    const tokenReceiverAccount = await getAssociatedTokenAddress(
      tokenMintPubkey,
      receiverPubkey,
      true,
    );

    if (
      !(await connection.getAccountInfo(tokenReceiverAccount))?.data.length
    ) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          publicKey,
          tokenReceiverAccount,
          receiverPubkey,
          tokenMintPubkey,
        ),
      );
    }

    transaction.add(
      createMintToInstruction(
        tokenMintPubkey,
        tokenReceiverAccount,
        publicKey,
        10 ** decimals * Number(amount),
      ),
    );

    signature = await sendTransaction(transaction, connection);

    setstaponClick(true)

    notify({
      type: "success",
      message: "Transaction successful!",
      txid: signature,
    });
  } catch (error: any) {
    notify({
      type: "error",
      message: `Transaction failed!`,
      description: error?.message,
      txid: signature,
    });
    console.log("error", `Transaction failed! ${error?.message}`, signature);
    return;
  }
}, [
  publicKey,
  tokenMintAddress,
  receiverAddress,
  amount,
  sendTransaction,
  connection,
]);



const [selectedAuthorities, setSelectedAuthorities] = useState([]);
  const [authorityType, setAuthorityType] = useState();

  const AuthorityType = {
    MintTokens: 0,
    FreezeAccount: 1,
  };

  const handleCheckboxChange = (value) => {
    setSelectedAuthorities((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value) // Убрать, если уже выбран
        : [...prev, value] // Добавить, если не выбран
    );
  };

  const onClickAuthority = useCallback(async () => {
    if (!publicKey) {
      notify({ type: "error", message: `Wallet not connected!` });
      console.log("error", `Send Transaction: Wallet not connected!`);
      return;
    }
  
    if (!selectedAuthorities.length) {
      notify({ type: "error", message: `No authority type selected!` });
      return;
    }
  
    let signature: TransactionSignature = "";
    const transaction = new Transaction();
  
    try {
      const tokenMintPubkey = new PublicKey(tokenMintAddress);
  
      // Добавляем инструкции для каждого выбранного типа полномочий
      selectedAuthorities.forEach((authorityType) => {
        transaction.add(
          createSetAuthorityInstruction(
            tokenMintPubkey, // Адрес токена
            publicKey, // Текущий владелец
            authorityType, // Тип полномочия
            null // Новый владелец (null для удаления полномочий)
          )
        );
      });
  
      // Отправляем транзакцию
      signature = await sendTransaction(transaction, connection);
  
      setstaponClickAuthority(true);
  
      notify({
        type: "success",
        message: "Transaction successful!",
        txid: signature,
      });
    } catch (error: any) {
      notify({
        type: "error",
        message: `Transaction failed!`,
        description: error?.message,
        txid: signature,
      });
      console.log("error", `Transaction failed! ${error?.message}`, signature);
      return;
    }
  }, [publicKey, tokenMintAddress, selectedAuthorities, sendTransaction, connection]);


  const  handleCreateTokenClick = async () => {
      if (!publicKey) {
        notify({ type: "error", message: `Wallet not connected!` });
        return;
      }
  
      if (imageFile == null) {
        notify({ type: "error", message: `No token icon!` });
        return;
      }
  
  
      if (tokenName == "") {
        notify({ type: "error", message: `No token name!` });
        return;
      }
  
  
      if (tokenSymbol == "") {
        notify({ type: "error", message: `No token symbol!` });
        return;
      }
  
      // Сначала вызываем uploadMetadata, затем createToken
  
      try {
        // Сначала создаём токен
        await uploadMetadata();
        await createToken();
        // Если tokenMintAddress успешно обновился, выполняем onClick
      } catch (error) {
        console.error("Error in handleCreateAndSend:", error);
        notify({ type: "error", message: "An error occurred during token creation or transaction." });
      }
      
    };



  const [hasRun, setHasRun] = useState(false); // Флаг для предотвращения повторного выполнения
    
    
  /*  
      useEffect(() => {
        if (tokenMintAddress && !hasRun) {
          setHasRun(true); // Устанавливаем флаг, чтобы больше не выполнять
          onClick();
      //    onClickAuthority();
        //  onClickCombined();
          console.log("tokenMintAddress:", tokenMintAddress);
          console.log("tokenMintAddress установлено.");
          setHasRun(true); // Устанавливаем флаг, чтобы больше не выполнять
          onClick();
        }
      }, [tokenMintAddress, hasRun]); // Выполняется при изменении tokenMintAddress или hasRun

*/

  const [step, setStep] = useState(0); // Текущий этап

  const onClickHandler = () => {
    setStep((prevStep) => prevStep + 1); // Увеличиваем шаг на 1

    if(step == 0 ){
      handleCreateTokenClick();
    }else if(step == 1 ){
      onClick();
    } if(step == 2 ){
      onClickAuthority();
    } 

  };

  return (
    <div >
      
     
   
      {step === 0 && !tokenMintAddress && !stapCreateToken ? (
          <div>
            <div className="mt-2 sm:grid sm:grid-cols-2 sm:gap-4">
              <div className="m-auto p-2">
                <div className="text-xl font-normal">Token icon</div>
                <p>Image file of your future token.</p>
              </div>

              <div className="flex p-2">
                <div className="m-auto rounded border border-dashed border-white px-2">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <label className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500">
                    <span>Upload an image</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={handleImageChange}
                    />
                  </label>
                  {!imageFile ? null : (
                    <p className="text-gray-500">{imageFile.name}</p>
                  )}
                </div>
              </div>
            </div>
          <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4 ">
            <div className="m-auto p-2 text-xl font-normal">Token name</div>
            <div className="m-auto p-2">
              <input
                className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                onChange={(e) => setTokenName(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="m-auto p-2">
              <div className="text-xl font-normal">Token symbol</div>
              <p>{"Abbreviated name (e.g. Solana -> SOL)."}</p>
            </div>
            <div className="m-auto p-2">
              <input
                className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                onChange={(e) => setTokenSymbol(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="m-auto p-2">
              <div className="text-xl font-normal">Token decimals</div>
              <p>Default value is 9 for solana.</p>
            </div>
            <div className="m-auto p-2">
              <input
                className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                type={"number"}
                min={0}
                value={tokenDecimals}
                onChange={(e) => setTokenDecimals(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
          </div>
          <div className="mt-4">
            <button
              className="... btn m-2 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 hover:from-pink-500 hover:to-yellow-500"
              onClick={onClickHandler}
            >
              Create token
            </button>
          </div>
          </div>
          ) : step === 1 && stapCreateToken && !staponClick ? (
            <div className="mt-4 break-words">
            <p className="font-medium">Link to your new token.</p>
            <a
              className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
              href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=${networkConfiguration}`}
              target="_blank"
              rel="noreferrer"
            >
              {tokenMintAddress}
            </a>
            <div>
            <h2 className="font-medium text-2xl mt-2">Mint</h2>
            <div className="flex mt-4  sm:gap-4 hidden">
              <div className="m-auto p-2 text-xl font-normal">
                Token mint address
              </div>
              <div className="m-auto p-2">
                <input
                  className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                  value={tokenMintAddress}
                />
              </div>
            </div>
            <div className="mt-4 sm:gap-4 hidden">
              <div className="m-auto p-2 text-xl font-normal">
                Receiver wallet address
              </div>
              <div className="m-auto p-2">
                <input
                  className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                  value={receiverAddress}
                />
              </div>
            </div>
            <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
              <div className="m-auto p-2 text-xl font-normal">Amount</div>
              <div className="m-auto p-2">
                <input
                  className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                  value={amount}
                  maxLength={20}
                  onChange={(e) => tokenInputValidation(e)}
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                className="... group btn m-2 w-60 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 disabled:animate-none "
                onClick={onClickHandler}
                disabled={!publicKey}
              >
                <div className="hidden group-disabled:block ">
                  Wallet not connected
                </div>
                <span className="block group-disabled:hidden">
                  Send Transaction
                </span>
              </button>
            </div>
          </div>
          </div>
        ) :  step === 2 && staponClick && !staponClickAuthority ? (
            <div>
              <a
              className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
              href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=${networkConfiguration}`}
              target="_blank"
              rel="noreferrer"
            >
              {tokenMintAddress}
            </a>
              <div className="mt-4  sm:gap-4 hidden">
                <div className="m-auto p-2 text-xl font-normal">
                  Token mint address
                </div>
                <div className="m-auto p-2">
                  <input
                    className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                    value={tokenMintAddress}
                  />
                </div>
              </div>
              <div className="">

              <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
                {/* Чекбоксы для выбора */}
                <label className="border rounded p-4">
                  <div className="flex items-center">
                    <span className="text-xl font-normal">Revoke Mint</span>
                    <input
                      type="checkbox"
                      value={AuthorityType.MintTokens}
                      checked={selectedAuthorities.includes(AuthorityType.MintTokens)}
                      onChange={() => handleCheckboxChange(AuthorityType.MintTokens)}
                      className="ml-auto"
                    />
                    
                  </div>
                  <h3 className="text-xs text-left mt-3">
                    No one will be able to create more tokens anymore
                  </h3>
                </label>
                <label className="border rounded p-4">
                  <div className="flex items-center">
                    <span className="text-xl font-normal">Revoke Freeze</span>
                    <input
                        type="checkbox"
                        value={AuthorityType.FreezeAccount}
                        checked={selectedAuthorities.includes(AuthorityType.FreezeAccount)}
                        onChange={() => handleCheckboxChange(AuthorityType.FreezeAccount)}
                        className="ml-auto"
                      />
                    
                  </div>
                  <h3 className="text-xs text-left mt-3">
                    No one will be able to freeze holders' token accounts anymore
                  </h3>
                </label>
              </div>
            </div>

      {/* Button */}
            <div className="mt-4">
              <button
                className="group btn m-2 w-60 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 disabled:animate-none"
                onClick={onClickHandler}
                disabled={!publicKey} // Деактивация кнопки, если publicKey отсутствует
              >
                <div className="hidden group-disabled:block">Wallet not connected</div>
                <span className="block group-disabled:hidden">Send Transaction</span>
              </button>
            </div>
            </div>
        ) : step === 3 && staponClickAuthority ? (
          <div className="mt-4 break-words">
            <p className="font-medium">Link to your new token.</p>
            <a
              className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
              href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=${networkConfiguration}`}
              target="_blank"
              rel="noreferrer"
            >
              {tokenMintAddress}
            </a>
          </div>
        ) :(
          <div className="mt-4 break-words">
            <p className="font-medium">Link to your new token.</p>
            <a
              className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
              href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=${networkConfiguration}`}
              target="_blank"
              rel="noreferrer"
            >
              {tokenMintAddress}
            </a>
          </div>
        )}
    </div>
  );
};
