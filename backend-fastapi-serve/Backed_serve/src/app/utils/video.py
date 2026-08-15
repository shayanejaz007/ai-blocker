import io
import av
from PIL import Image


def extract_frames(video_bytes: bytes, fps: int = 2) -> list[Image.Image]:
    container = av.open(io.BytesIO(video_bytes))
    stream = container.streams.video[0]
    stream.thread_type = "AUTO"

    video_fps = float(stream.average_rate or stream.guessed_rate or 30)
    frame_interval = max(1, int(video_fps / fps))

    frames = []
    for idx, frame in enumerate(container.decode(video=0)):
        if idx % frame_interval == 0:
            frames.append(frame.to_image())

    container.close()
    return frames
