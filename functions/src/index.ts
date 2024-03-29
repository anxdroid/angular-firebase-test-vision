import {ImageAnnotatorClient, protos} from "@google-cloud/vision";
import {https} from "firebase-functions";

type AnnotatePayload = {
  image: string; // Base64 of image
};

type LabelDetected = {
  description: string;
  score: number;
  boundingPoly?: protos.google.cloud.vision.v1.IBoundingPoly | null;
};

const client = new ImageAnnotatorClient();

/**
 * This will allow requests to Vision API. Body of payload should be type of {@link AnnotatePayload}.
 * Features in request are compatible with {@link https://cloud.google.com/vision/docs/reference/rest/v1/Feature REST Cloud Vision API}
 *
 * @return List of {@link LabelDetected}
 */
export const annotateImage = https.onCall(
  async (data: AnnotatePayload): Promise<LabelDetected[]> => {
    try {
      const [{labelAnnotations}] = await client.labelDetection({
        image: {
          content: data.image,
        },
      });

      if (!labelAnnotations || labelAnnotations === null) {
        return [];
      }

      return labelAnnotations
        .filter((a) => a.description && a.description !== null)
        .map((a) => ({
          description: a.description as string,
          score: a.score ?? 0,
          boundingPoly: a.boundingPoly,
        }));
    } catch (e: unknown) {
      const error = e as Error;
      throw new https.HttpsError("internal", error.message);
    }
  }
);

export const recognizeText = https.onCall(
  async (data: AnnotatePayload): Promise<LabelDetected[]> => {
    try {
      const [{textAnnotations}] = await client.textDetection({
        image: {
          content: data.image,
        },
      });

      if (!textAnnotations || textAnnotations === null) {
        return [];
      }

      return textAnnotations
        .filter((a) => a.description && a.description !== null)
        .map((a) => ({
          description: a.description as string,
          score: a.score ?? 0,
          boundingPoly: a.boundingPoly,
        }));
    } catch (e: unknown) {
      const error = e as Error;
      throw new https.HttpsError("internal", error.message);
    }
  }
);
