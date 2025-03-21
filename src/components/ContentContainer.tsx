import { FC } from "react";
import Link from "next/link";
import { Key, Coins, Send, TrendingUp, Users, Pill, Lock } from "lucide-react";

export const ContentContainer: FC = (props) => {
  return (
    <div className="flex bg-neutral ">
      {/* Sidebar */}
      <div className="w-16 bg-neutral text-gray-300 flex flex-col items-center py-4">
        <ul className="flex flex-col gap-6">

          <li className="">
            <Link href="/create">
              <a className="flex flex-col items-center ">
                <Coins className="h-6 w-6" />
              </a>
            </Link>
          </li>
      {/* <li>
            <Link href="/upload">
              <a className="flex flex-col items-center">
                <Send className="h-6 w-6" />
              </a>
            </Link>
          </li>  */}
          <li>
            <Link href="/utils">
              <a className="flex flex-col items-center">
                <TrendingUp className="h-6 w-6" />
              </a>
            </Link>
          </li>
          <li>
            <Link href="/misc">
              <a className="flex flex-col items-center">
                <Users className="h-6 w-6" />
              </a>
            </Link>
          </li>
        </ul>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-neutral p-4">{props.children}</div>
    </div>
  );
};