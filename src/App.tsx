import React from "react";
import { useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import "./index.css";

const App: React.FC = () => {
  const [token, setToken] = useState<string>("");
  const [stompClient, setStompClient] = useState<Client | null>(null); // STOMP 클라이언트 상태 저장
  const [messages, setMessages] = useState<string[]>([]); // 메시지 저장
  const [chatMessage, setChatMessage] = useState<string>(""); // 채팅 메시지 상태 관리

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatMessage(e.target.value); // 메시지 입력 필드 상태 관리
  };

  const handleConnect = () => {
    console.log(token);
    const socket = new SockJS("http://localhost:8080/ws", null, {
      transports: ["websocket", "xhr-streaming", "xhr-polling"],
      withCredentials: true, // 자격 증명을 포함한 요청 허용
    }); // SockJS WebSocket 연결 (Spring 서버에 맞는 경로)
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000, // 자동 재연결 설정
      debug: (str) => {
        console.log(str); // 디버그 메시지 출력
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`, // Authorization 헤더에 토큰 추가
      },
    });

    client.onConnect = () => {
      console.log("WebSocket 연결 성공");
    };

    client.onStompError = (frame) => {
      console.error("STOMP 오류 발생: ", frame.headers["message"]);
    };

    client.activate(); // 연결 시작
    setStompClient(client); // STOMP 클라이언트 저장
  };

  const handleSubscribe = () => {
    if (stompClient) {
      stompClient.subscribe(
        "/sub/room/default-room",
        (message) => {
          const body = JSON.parse(message.body);
          console.log("메시지 수신: ", body);
          setMessages((prevMessages) => [...prevMessages, body.message]); // 새로운 메시지를 추가
        },
        {
          Authorization: `Bearer ${token}`, // 구독 시에도 Authorization 헤더 추가
        }
      );
      console.log("구독 성공");

      stompClient.publish({
        destination: "/pub/chat/lobby-message",
        body: JSON.stringify({
          roomId: "lobby",
          type: "ENTER",
          sender: "khg", // 실제 유저 ID 또는 닉네임으로 교체
          message: "유저가 로비에 입장했습니다.", // 입장 메시지
        }),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } else {
      console.error("STOMP 클라이언트가 없습니다. 먼저 연결해주세요.");
    }
  };

  const handleSendMessage = () => {
    if (stompClient && chatMessage.trim()) {
      stompClient.publish({
        destination: "/pub/chat/lobby-message", // 메시지 발송 경로 (Spring 서버 설정에 맞게 수정)
        body: JSON.stringify({
          roomId: "lobby",
          sender: "khg",
          message: chatMessage,
        }),
        headers: {
          Authorization: `Bearer ${token}`, // 메시지 전송 시에도 Authorization 헤더 추가
        },
      });
      setChatMessage(""); // 메시지 전송 후 입력 필드 비우기
    }
  };

  return (
    <>
      <h1 className="text-gray-300 text-5xl text-black">채팅창</h1>
      <section>
        <input
          type="text"
          className="border-2 w-1/3 border-black m-2 p-3"
          value={token}
          onChange={handleInputChange}
        />
        <button
          className="border-2 border-black m-2 p-3"
          onClick={handleConnect}
        >
          연결하기
        </button>
        <button
          className="border-2 border-black m-2 p-3"
          onClick={handleSubscribe}
        >
          구독하기
        </button>
      </section>

      <section className="border-2 border-gray-300 rounded-md h-96 w-full p-4 bg-white overflow-y-auto shadow-md">
        <div className="text-gray-500 text-sm">
          {messages.length > 0
            ? messages.map((msg, index) => <div key={index}>{msg}</div>)
            : "채팅 기록이 여기에 표시됩니다..."}
        </div>
      </section>

      <section className="mt-4 flex">
        <input
          type="text"
          className="border-2 border-gray-300 flex-1 rounded-lg p-2 shadow-sm focus:outline-none focus:border-blue-500"
          value={chatMessage}
          onChange={handleMessageChange}
          placeholder="메시지를 입력하세요..."
        />
        <button
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600"
          onClick={handleSendMessage}
        >
          전송
        </button>
      </section>
    </>
  );
};

export default App;
