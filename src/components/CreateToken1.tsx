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
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "contexts/NetworkConfigurationProvider";
import { ChangeEvent, FC, useCallback, useState } from "react";
import { notify } from "../utils/notifications";
import { INPUT_FLOAT_REGEX } from "../constants";
import {
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";
import {
  AuthorityType,
  createSetAuthorityInstruction,
} from "@solana/spl-token";

import { PinataSDK } from "pinata-web3";

export const CreateToken: FC = () => {

//  const [ipfsToken, setIpfsToken] = useState("");
  const [imageFile, setImageFile] = useState(null);


  const [tokenDescription, setTokenDescription] = useState("");
  const [jsonUri, setJsonUri] = useState("");

  const JWT_IPFS_TOKEN  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI2ZTg3NjJlNC0xOGY4LTQwMzgtYTRiMy1jMTFkMTI4NDJiZjYiLCJlbWFpbCI6ImFmZmlsaWF0ZWtpeEBtYWlsLnJ1IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjJiMTI0MTI5Y2E2YTJmNjgzYTU3Iiwic2NvcGVkS2V5U2VjcmV0IjoiMjRlMjRmZGIxMTgzMjQ2ZWU2OGYyZWJhOTA4ZDYwM2U4Mzg0MTg3NjI4OTMwOGQwZWI2NDE4ODc2MDk0YmQ0ZCIsImV4cCI6MTc3MzU3OTcxOX0.zuu_Dt7gu8PZFJETVS61umGIRgbShQZATAen-cWRweM"


  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { networkConfiguration } = useNetworkConfiguration();

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenUri, setTokenUri] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState("9");
  const [tokenMintAddress, setTokenMintAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);


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
                uri: jsonUri,
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

      console.log(mintKeypair.publicKey.toString())

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


  console.log("tokenMintAddress:", tokenMintAddress);

    //Mint

  const [amount, setAmount] = useState("0.0");

  const receiverAddress = publicKey?.toBase58() || null;



  const tokenInputValidation = async (e: ChangeEvent<HTMLInputElement>) => {
      const res = new RegExp(INPUT_FLOAT_REGEX).exec(e.target.value);
      res && setAmount(e.target.value);
    };
  

    
  const onClick = useCallback(async () => {


      if (!publicKey) {
        notify({ type: "error", message: `Wallet not connected!` });
        console.log("error", `Send Transaction: Wallet not connected!`);
        return;
      }
   
      let signature: TransactionSignature = "";

      const transaction = new Transaction();
      
      

      try {
        console.log("tokenMintAddress:", tokenMintAddress);

        const tokenMintPubkey = new PublicKey(tokenMintAddress);

        const receiverPubkey = new PublicKey(receiverAddress);

        console.log("tokenMintAddress:", tokenMintAddress);
        console.log("receiverAddress:", receiverAddress);
        console.log("publicKey:", publicKey?.toBase58());
        console.log("amount:", amount);
  
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

        console.log("tokenMintAddress:", tokenMintAddress);
        console.log("receiverAddress:", receiverAddress);
        console.log("publicKey:", publicKey?.toBase58());
        console.log("amount:", amount);
       
        transaction.add(
          createMintToInstruction(
            tokenMintPubkey,
            tokenReceiverAccount,
            publicKey,
            10 ** decimals * Number(amount),
          ),
        );

        console.log(publicKey);

        signature = await sendTransaction(transaction, connection);
  
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


  //Authority

  const [authorityType, setAuthorityType] = useState(null);

  const onClickAuthority = useCallback(async () => {
    if (!publicKey) {
      notify({ type: "error", message: `Wallet not connected!` });
      console.log("error", `Send Transaction: Wallet not connected!`);
      return;
    }

    let signature: TransactionSignature = "";
    const transaction = new Transaction();

    
    try {
      const tokenMintPubkey = new PublicKey(tokenMintAddress);
      console.log(tokenMintAddress)
      transaction.add(
        createSetAuthorityInstruction(
          tokenMintPubkey,
          publicKey,
          authorityType,
          null,
        ),
      );

      signature = await sendTransaction(transaction, connection);

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
  }, [publicKey, tokenMintAddress, authorityType, sendTransaction, connection]);  






 /* const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (e) => {
    setIsChecked(e.target.checked);
  };
*/
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

    console.log("tokenMintAddress:", tokenMintAddress);
 {/*if (isChecked) {
      onClick(); // Выполняется только если чекбокс активен
    } */} 
    
  };

 

  let hasRun = false; // Флаг для предотвращения повторного выполнения

  function checkTokenMintAddress() {
    if (tokenMintAddress && !hasRun) {
      hasRun = true; // Устанавливаем флаг, чтобы больше не выполнять
      onClick();
       if(authorityType != null){
      onClickAuthority();
     } 

      console.log("tokenMintAddress установлено.");
    }
  }
  
  // Вызываем функцию проверки периодически (например, в setInterval)
  setInterval(checkTokenMintAddress, 1000); // Проверяем каждую секунду
  


  
  return (
    <div>
      <div>
        {isLoading && (
          <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
            <ClipLoader />
          </div>
        )}
        {!jsonUri ? (
          <div>
           {/*  <div className="mt-4 sm:grid sm:grid-cols-2  sm:gap-4">
              <div className="m-auto p-2">
                <div className="text-xl font-normal">Pinata JWT</div>
                <p>Token used to upload your data to IPFS.</p>
                <p>Currently only Pinata is supported.</p>
                <p>
                  You can get one
                  <a
                    className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
                    href="https://app.pinata.cloud/developers/api-keys"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {" here "}
                  </a>
                  for free.
                </p>
              </div>
              <div className="m-auto p-2">
                <input
                  className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                  onChange={(e) => setIpfsToken(e.target.value)}
                  value={JWT_IPFS_TOKEN}
                />
              </div>
            </div>*/}
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
            <div className="mt-2 sm:grid sm:grid-cols-2 sm:gap-4">
              <div className="m-auto p-2 text-xl font-normal">Token name</div>
              <div className="m-auto p-2">
                <input
                  className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                  onChange={(e) => setTokenName(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2 sm:grid sm:grid-cols-2 sm:gap-4">
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
            <div className="mt-2 sm:grid sm:grid-cols-2 sm:gap-4">
              <div className="m-auto p-2">
                <div className="text-xl font-normal">Token description</div>
                <p>Few words about your token purpose.</p>
              </div>
              <div className="m-auto p-2">
                <input
                  className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                  onChange={(e) => setTokenDescription(e.target.value)}
                />
              </div>
            </div>
   {/*      <div className="mt-4">
              <button
                className="... btn m-2 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 hover:from-pink-500 hover:to-yellow-500"
                onClick={uploadMetadata}
              >
                Upload Metadata
              </button>
            </div>*/}    
          </div>
        ) : (
          <div className="mt-4 break-words">
       {/*     <p className="font-medium">
              Link to your uploaded metadata. You will need this as uri parameter
              when creating a token.
            </p>
            <a
              className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
              href={jsonUri}
              target="_blank"
              rel="noreferrer"
            >
              {jsonUri}
            </a>*/}
          </div>
        )}
      </div>
      <div>
        {isLoading && (
          <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
            <ClipLoader />
          </div>
        )}
        {!tokenMintAddress ? (
          <div>
         {/*   <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
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
        {/*   <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
              <div className="m-auto p-2">
                <div className="text-xl font-normal">Token URI</div>
                <p>Link to your metadata json file.</p>
                <p>
                  Paste an existing one or create new
                  <a
                    className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
                    href="./upload"
                  >
                    {" here"}
                  </a>
                  .
                </p>
                <p>You can leave it blank if you don`t need token image.</p>
              </div>
              <div className="m-auto p-2">
                <input
                  className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                  onChange={(e) => setTokenUri(e.target.value)}
                />
              </div>
            </div>*/}  
            <div className="mt-2 sm:grid sm:grid-cols-2 sm:gap-4">
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
                className="... btn m-2 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 hover:from-pink-500 hover:to-yellow-500"
                onClick={handleCreateTokenClick}
              >
                Create token
              </button>
            </div>
          </div>
        ) : (
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

  {/*     <div>
        <div>
      {/*     <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="m-auto p-2 text-xl font-normal">
              Token mint address
            </div>
            <div className="m-auto p-2">
              <input
                className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                onChange={(e) => setTokenMintAddress(e.target.value)}
                value={tokenMintAddress}
              />
            </div>
          </div>
          <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="m-auto p-2 text-xl font-normal">
              Receiver wallet address
            </div>
            <div className="m-auto p-2">
              <input
                className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
                onChange={(e) => setReceiverAddress(e.target.value)}
                value={publicKey}
              />
            </div>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={handleCheckboxChange}
              className="w-4 h-4"
            />
            <span className="">Mint</span>
          </label>
        
          <div className="mt-4">
          
 {/*            <button
              className="... group btn m-2 w-60 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 disabled:animate-none "
              onClick={onClick}
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
      </div>*/}


    <div>
      <div>
    {/*    <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
          <div className="m-auto p-2 text-xl font-normal">
            Token mint address
          </div>
           <div className="m-auto p-2">
            <input
              className="rounded border px-4 py-2 text-xl font-normal text-gray-700 focus:border-blue-600 focus:outline-none"
              onChange={(e) => setTokenMintAddress(e.target.value)}
            />
          </div>
        </div>*/}
        <div className="mt-4 ">
       {/*  <div className="m-auto p-2 text-xl font-normal">Authority type</div>
             <div className="m-auto p-2">
            <select
              className="select-bordered select text-xl font-normal"
              value={authorityType}
              onChange={(e) =>
                setAuthorityType(Number(e.target.value) as AuthorityType)
              }
            >
              <option value={AuthorityType.MintTokens}>Mint</option>
              <option value={AuthorityType.FreezeAccount}>Freeze</option>
            </select>
          </div>
        */}     
        {!tokenMintAddress ? (
          <div className="m-auto p-2">
      {/*       <div className="text-xl font-normal mb-6">Authority type</div>*/}
            <div className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-4">
              <label className="border rounded p-4">
                <label  className="flex items-center m-auto ">
                  <h2 className="mr-14">Revoke Mint</h2>
                  <input
                    type="checkbox"
                    value={AuthorityType.MintTokens}
                    checked={authorityType === AuthorityType.MintTokens}
                    onChange={() => {
                      setAuthorityType(
                        authorityType === AuthorityType.MintTokens ? null : AuthorityType.MintTokens
                      );
                    }}
                    className="ml-auto"
                  />
                </label>
                <h3 className="text-xs text-left mt-3">No one will be able to create more tokens anymore</h3>
              </label>
              <label className="border rounded p-4">
                <label className="flex  m-auto " >
                  <h2 className="mr-14">Revoke Freeze</h2>
                  <input
                    type="checkbox"
                    value={AuthorityType.FreezeAccount}
                    checked={authorityType === AuthorityType.FreezeAccount}
                    onChange={() => {
                      setAuthorityType(
                        authorityType === AuthorityType.FreezeAccount ? null : AuthorityType.FreezeAccount
                      );
                    }}
                    className="ml-auto"
                  />
                </label>
                <h3 className="text-xs text-left mt-3">No one will be able to freeze holders' token accounts anymore</h3>
              </label>
            </div>
          </div>
          ) : (
          <div className="mt-4 break-words">
            
          </div>
        )}
        </div>
        
      {/*  <div className="mt-4">
          <button
            className="... group btn m-2 w-60 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 disabled:animate-none "
            onClick={onClickAuthority}
            disabled={!publicKey}
          >
            <div className="hidden group-disabled:block ">
              Wallet not connected
            </div>
            <span className="block group-disabled:hidden">
              Send Transaction
            </span>
          </button>
        </div>*/}
      </div>
    </div>
    </div>
  );
};
