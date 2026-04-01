import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/ PageLoader.jsx";
import { summarizeCall } from "../lib/api";
import { MessageSquare, FileText, X, Video, Download, RefreshCw, Trash2 } from "lucide-react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const CallPage = () => {
  const { id: callId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const { authUser, isLoading } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initCall = async () => {
      if (!tokenData.token || !authUser || !callId) return;

      try {
        console.log("Initializing Stream video client...");

        const user = {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        };

        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        });

        const callInstance = videoClient.call("default", callId);

        await callInstance.join({ create: true });

        console.log("Joined call successfully");

        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.error("Error joining call:", error);
        toast.error("Could not join the call. Please try again.");
      } finally {
        setIsConnecting(false);
      }
    };

    initCall();
  }, [tokenData, authUser, callId]);

  if (isLoading || isConnecting) return <PageLoader />;

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="relative">
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent call={call} />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>Could not initialize call. Please refresh or try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CallContent = ({ call }) => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const navigate = useNavigate();

  const [transcriptions, setTranscriptions] = useState([]);
  const [showChat, setShowChat] = useState(true);
  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [recordings, setRecordings] = useState(null);
  const [isFetchingRecordings, setIsFetchingRecordings] = useState(false);
  const [isDeletingRecording, setIsDeletingRecording] = useState(false);

  useEffect(() => {
    if (!call) return;

    // Start transcription and recording
    const startFeatures = async () => {
      try {
        await call.startTranscription();
        await call.startRecording();
        toast.success("Transcription and recording started");
      } catch (err) {
        console.error("Error starting features:", err);
      }
    };

    startFeatures();

    // Listen for transcription events
    const unsubscribe = call.on("call.transcription_ready", (event) => {
      // Stream transcription events might vary, usually it's real-time messages
      // For this SDK, we'll mimic the event listening logic
    });

    // Mock live transcription for demonstration if Stream event doesn't fire immediately
    // In a real scenario, you'd use call.on('transcription.received', ...)
    const handleTranscription = (event) => {
      if (event.type === "transcription.received") {
        setTranscriptions((prev) => [...prev, event.transcription]);
      }
    };

    call.on("transcription.received", handleTranscription);

    return () => {
      unsubscribe();
      call.off("transcription.received", handleTranscription);
    };
  }, [call]);

  const handleSummarize = async () => {
    if (transcriptions.length === 0) {
      toast.error("No conversation to summarize yet!");
      return;
    }

    setIsSummarizing(true);
    try {
      const data = await summarizeCall(transcriptions);
      setSummary(data.summary);
    } catch (err) {
      toast.error("Failed to generate summary");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleFetchRecordings = async () => {
    setIsFetchingRecordings(true);
    try {
      const response = await call.queryRecordings();
      setRecordings(response.recordings);
      if (response.recordings.length === 0) {
        toast.error("No recordings found yet. It usually takes a minute after the call ends.");
      }
    } catch (err) {
      console.error("Error fetching recordings:", err);
      toast.error("Failed to fetch recordings");
    } finally {
      setIsFetchingRecordings(false);
    }
  };

  const handleDeleteRecording = async (filename) => {
    if (!window.confirm("Are you sure you want to delete this recording? This action cannot be undone.")) return;

    setIsDeletingRecording(true);
    try {
      await call.deleteRecording({ filename });
      toast.success("Recording deleted successfully from the cloud");
      // Refresh the list
      handleFetchRecordings();
    } catch (err) {
      console.error("Error deleting recording:", err);
      toast.error("Failed to delete recording. Only the call creator or an admin can delete cloud recordings.");
    } finally {
      setIsDeletingRecording(false);
    }
  };

  if (callingState === CallingState.LEFT) return navigate("/");

  return (
    <StreamTheme>
      <div className="flex w-full h-full max-w-6xl mx-auto gap-4 p-4">
        {/* Main Video Area */}
        <div className={`flex-grow transition-all duration-300 ${showChat ? "w-2/3" : "w-full"}`}>
          <SpeakerLayout />
          <CallControls />
        </div>

        {/* Side Chatbox / Transcription Panel */}
        {showChat && (
          <div className="w-1/3 bg-base-200 rounded-xl flex flex-col shadow-xl border border-base-300 overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-base-300 flex items-center justify-between bg-primary text-primary-content">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} />
                <h3 className="font-bold">Live Transcript</h3>
              </div>
              <button onClick={() => setShowChat(false)} className="btn btn-ghost btn-xs text-primary-content">
                <X size={16} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {transcriptions.length === 0 ? (
                <div className="text-center text-base-content/50 mt-10 italic">
                  Waiting for someone to speak...
                </div>
              ) : (
                transcriptions.map((t, i) => (
                  <div key={i} className="chat chat-start">
                    <div className="chat-header opacity-50 text-xs mb-1">
                      {t.user?.name || "User"}
                    </div>
                    <div className="chat-bubble bg-base-100 text-base-content text-sm">
                      {t.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-base-300 bg-base-100 flex flex-col gap-2">
              <button
                onClick={handleSummarize}
                disabled={isSummarizing || transcriptions.length === 0}
                className="btn btn-primary btn-block gap-2"
              >
                {isSummarizing ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  <FileText size={18} />
                )}
                Summarize Call
              </button>

              <button
                onClick={handleFetchRecordings}
                disabled={isFetchingRecordings}
                className="btn btn-outline btn-block gap-2"
              >
                {isFetchingRecordings ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  <Video size={18} />
                )}
                View Recordings
              </button>
            </div>
          </div>
        )}

        {/* Floating Toggle Button (when chat is hidden) */}
        {!showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="fixed right-6 bottom-24 btn btn-circle btn-primary shadow-lg"
          >
            <MessageSquare size={24} />
          </button>
        )}
      </div>

      {/* Summary Modal */}
      {summary && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl bg-base-100 border border-primary/20 shadow-2xl">
            <h3 className="font-bold text-2xl flex items-center gap-3 text-primary mb-4">
              <FileText /> Call Summary
            </h3>
            <div className="prose prose-sm max-w-none prose-headings:text-primary">
              <div className="whitespace-pre-wrap text-base-content/80 leading-relaxed">
                {summary}
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-primary" onClick={() => setSummary(null)}>Close</button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/60" onClick={() => setSummary(null)}></div>
        </div>
      )}

      {/* Recordings Modal */}
      {recordings && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl bg-base-100 border border-secondary/20 shadow-2xl">
            <h3 className="font-bold text-2xl flex items-center gap-3 text-secondary mb-4">
              <Video /> Call Recordings
            </h3>

            <p className="text-sm text-base-content/60 mb-6">
              These recordings are stored securely on Stream.io's encrypted cloud. Only you have access through your developer token.
            </p>

            <div className="space-y-4">
              {recordings.length === 0 ? (
                <div className="alert alert-info py-8 flex flex-col items-center gap-4">
                  <RefreshCw className="animate-spin size-8 opacity-40" />
                  <p className="text-center">No recordings found. If you just ended your call, please wait a minute for the video to process.</p>
                  <button onClick={handleFetchRecordings} className="btn btn-sm btn-ghost">Refresh List</button>
                </div>
              ) : (
                recordings.map((recording, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-base-200 rounded-lg border border-base-300 hover:border-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="size-10 bg-secondary/10 flex items-center justify-center rounded-lg">
                        <Video className="text-secondary size-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Recording {index + 1}</p>
                        <p className="text-xs text-base-content/50">
                          {new Date(recording.start_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={recording.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-secondary gap-2"
                      >
                        <Download size={14} /> Download
                      </a>
                      <button
                        onClick={() => handleDeleteRecording(recording.filename)}
                        className="btn btn-sm btn-error btn-outline btn-square"
                        title="Delete Recording"
                        disabled={isDeletingRecording}
                      >
                        {isDeletingRecording ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="modal-action">
              <button className="btn btn-outline" onClick={() => setRecordings(null)}>Close</button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/60" onClick={() => setRecordings(null)}></div>
        </div>
      )}
    </StreamTheme>
  );
};

export default CallPage;
